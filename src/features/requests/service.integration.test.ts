import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { test } from "node:test"
import { readFile, readdir } from "node:fs/promises"
import { Client } from "pg"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { createDelivery } from "@/features/deliveries/service"
import { createDeliverySchema } from "@/features/deliveries/schemas"
import { createRequestSchema } from "./schemas"
import { createRequest, deleteRequest, getRequest, listRequests, updateRequest } from "./service"

// Habilitar únicamente contra una DB de desarrollo con las migraciones aplicadas.
test(
  "folios persistentes, reglas de atención, sincronización y protección de entregas",
  { skip: process.env.RUN_REQUEST_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const userId = `request-test-${randomUUID()}`
    const marker = userId
    const hasStatus = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
    await prisma.user.create({ data: { id: userId, name: marker, email: `${userId}@example.invalid` } })
    try {
      const type = await prisma.eventType.create({ data: { name: marker, createdBy: userId } })
      const eventData = { date: new Date(), address: marker, institutions: "-", actions: "-", typeId: type.id }
      const [first, second] = await Promise.all(
        ["A", "B"].map((suffix) =>
          prisma.event.create({ data: { ...eventData, folio: `${marker}-${suffix}`, createdBy: userId } }),
        ),
      )
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: marker, createdBy: userId },
      })
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: userId } })

      // Altas concurrentes: folios distintos y correlativos.
      const [a, b] = await Promise.all([
        createRequest(createRequestSchema.parse({ channel: marker, eventId: first.id }), userId),
        createRequest(createRequestSchema.parse({ channel: marker }), userId),
      ])
      assert.notEqual(a.folio, b.folio)
      assert.match(a.folio, /^SOL-\d{4}-\d{3,}$/)
      assert.equal((await listRequests({ q: marker, event: "with" })).data.length, 1)
      assert.equal((await listRequests({ q: marker, event: "without" })).data.length, 1)
      await assert.rejects(
        createRequest(createRequestSchema.parse({ channel: marker, eventId: "cm00000000000000000000000" }), userId),
        hasStatus(409),
      )

      await assert.rejects(
        createRequest(createRequestSchema.parse({ channel: marker, status: "attended" }), userId),
        hasStatus(400),
      )
      await assert.rejects(updateRequest(b.id, { status: "attended" }, userId), hasStatus(400))
      await updateRequest(
        b.id,
        { status: "attended", response: "Respuesta registrada", description: "Necesita ayuda" },
        userId,
      )
      await assert.rejects(updateRequest(b.id, { response: null }, userId), hasStatus(400))
      await updateRequest(b.id, { description: "Descripción editada" }, userId)
      assert.equal((await getRequest(b.id)).response, "Respuesta registrada")
      assert.equal(
        (await listRequests({ q: "Descripción editada" })).data.some((row) => row.id === b.id),
        true,
      )
      await updateRequest(b.id, { status: "pending", response: null }, userId)

      const delivery = await createDelivery(
        createDeliverySchema.parse({
          beneficiary: marker,
          beneficiaryRut: "12345678-5",
          neighborhoodAssociationId: association.id,
          address: "Prueba",
          date: "2026-10-14",
          requestId: a.id,
          items: [{ supplyId: supply.id, quantity: 1 }],
        }),
        userId,
      )
      assert.equal(delivery.eventId, first.id)
      assert.equal((await getRequest(a.id)).status, "pending")

      // B04: cambiar o quitar el evento de la solicitud se propaga a su entrega.
      await updateRequest(a.id, { eventId: second.id }, userId)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, second.id)
      await updateRequest(a.id, { status: "attended" }, userId)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, second.id)
      await updateRequest(a.id, { eventId: null }, userId)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, null)
      assert.equal((await getRequest(a.id)).delivery?.id, delivery.id)

      // Ni confirmar la entrega ni omitir el parámetro permite borrar la solicitud.
      for (const expected of [undefined, "", delivery.id]) {
        await assert.rejects(deleteRequest(a.id, expected, userId), hasStatus(409))
      }
      await assert.rejects(prisma.request.delete({ where: { id: a.id } }))
      assert.equal((await getRequest(a.id)).delivery?.id, delivery.id)
      assert.equal(await prisma.deliveryItem.count({ where: { deliveryId: delivery.id } }), 1)

      // Borrar el máximo y volver a crear no reutiliza su folio.
      const newest = await createRequest(createRequestSchema.parse({ channel: marker }), userId)
      await deleteRequest(newest.id, undefined, userId)
      const after = await createRequest(createRequestSchema.parse({ channel: marker }), userId)
      assert.equal(BigInt(after.folio.split("-")[2]), BigInt(newest.folio.split("-")[2]) + BigInt(1))
      await deleteRequest(b.id, undefined, userId)
      await assert.rejects(getRequest(b.id), hasStatus(404))
    } finally {
      await prisma.deliveryItem.deleteMany({ where: { delivery: { createdBy: userId } } })
      await prisma.delivery.deleteMany({ where: { createdBy: userId } })
      await prisma.request.deleteMany({ where: { createdBy: userId } })
      await prisma.event.deleteMany({ where: { createdBy: userId } })
      await prisma.eventType.deleteMany({ where: { createdBy: userId } })
      await prisma.supply.deleteMany({ where: { createdBy: userId } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } })
      await prisma.user.delete({ where: { id: userId } })
      await prisma.auditLog.deleteMany({ where: { actorId: userId } })
      await prisma.$disconnect()
    }
  },
)

test(
  "migración conserva solicitudes y continúa los máximos históricos por año",
  { skip: process.env.RUN_REQUEST_INTEGRATION !== "1" },
  async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    const schema = `request_migration_${randomUUID().replaceAll("-", "")}`
    try {
      await client.query(`CREATE SCHEMA "${schema}"`)
      await client.query(`SET search_path TO "${schema}"`)
      const root = new URL("../../../prisma/migrations/", import.meta.url)
      const target = "20261115160000_request_rules"
      const migrations = (await readdir(root)).filter((name) => /^\d/.test(name) && name < target).sort()
      for (const name of migrations) await client.query(await readFile(new URL(`${name}/migration.sql`, root), "utf8"))
      await client.query(
        `INSERT INTO "user" (id, name, email, "updatedAt") VALUES ('test', 'Test', 'test@example.invalid', now())`,
      )
      const folios = ["SOL-2026-999", "SOL-2026-1000", "SOL-2025-050", "SOL-legacy-uuid"]
      for (const folio of folios)
        await client.query(
          `INSERT INTO "request" (id, folio, channel, "createdBy", "updatedAt") VALUES ($1, $1, 'Test', 'test', now())`,
          [folio],
        )
      await client.query(await readFile(new URL(`${target}/migration.sql`, root), "utf8"))
      const counters = await client.query("SELECT * FROM request_folio_counter ORDER BY year")
      assert.deepEqual(counters.rows, [
        { year: 2025, lastValue: "50" },
        { year: 2026, lastValue: "1000" },
      ])
      assert.equal((await client.query('SELECT * FROM "request" WHERE description IS NULL')).rowCount, 4)
      const constraint = await client.query(
        `SELECT confdeltype FROM pg_constraint WHERE conrelid = 'delivery'::regclass AND conname = 'delivery_requestId_fkey'`,
      )
      assert.equal(constraint.rows[0].confdeltype, "r")
    } finally {
      await client.query("ROLLBACK")
      await client.query(`DROP SCHEMA "${schema}" CASCADE`)
      await client.end()
    }
  },
)
