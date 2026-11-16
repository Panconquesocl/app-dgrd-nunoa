import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { auditedTransaction } from "./transaction"
import { listAudit, getAuditActors } from "./service"
import { createSupply, updateSupply, deleteSupply } from "@/features/supplies/service"
import { createEventType } from "@/features/event-types/service"
import { createNeighborhoodAssociation } from "@/features/neighborhood-associations/service"
import { createStrategicAction } from "@/features/strategic-actions/service"
import { createActivity } from "@/features/activities/service"
import { createRequest, updateRequest } from "@/features/requests/service"
import { createRequestSchema } from "@/features/requests/schemas"
import { createEvent, deleteEvent } from "@/features/events/service"
import { getEventDeletionImpact } from "@/features/events/service"
import { createDelivery, updateDelivery, deleteDelivery } from "@/features/deliveries/service"
import { createDeliverySchema } from "@/features/deliveries/schemas"
import { createUser, updateUser, setUserActive, resetUserPassword, deleteUser } from "@/features/users/service"

test(
  "auditoría atómica: todos los módulos, actor real, cascadas, borrado y secretos excluidos",
  { skip: process.env.RUN_AUDIT_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const marker = `audit-${randomUUID()}`
    const owner = `${marker}-owner`
    const actor = `${marker}-actor`
    const password = "audit-fixture-password-2026"
    try {
      for (const id of [owner, actor])
        await prisma.user.create({
          data: { id, name: id, email: `${id}@example.invalid`, role: "admin", banned: false },
        })
      const supply = await createSupply({ type: marker, unit: "unidad" }, owner)
      await updateSupply(supply.id, { type: `${marker}-updated` }, actor)
      const edit = await prisma.auditLog.findFirstOrThrow({
        where: { resource: "supplies", entityId: supply.id, action: "update" },
      })
      assert.equal(edit.actorId, actor)
      assert.deepEqual(edit.before, { type: marker })
      assert.deepEqual(edit.after, { type: `${marker}-updated` })
      const count = await prisma.auditLog.count({ where: { actorId: actor } })
      await updateSupply(supply.id, { type: `${marker}-updated` }, actor)
      assert.equal(await prisma.auditLog.count({ where: { actorId: actor } }), count)
      await assert.rejects(
        auditedTransaction(actor, async (tx) => {
          await tx.supply.create({ data: { type: `${marker}-rollback`, unit: "unidad", createdBy: owner } })
          throw new Error("rollback")
        }),
      )
      assert.equal(await prisma.supply.count({ where: { type: `${marker}-rollback` } }), 0)
      assert.equal(await prisma.auditLog.count({ where: { entityLabel: `${marker}-rollback` } }), 0)
      const type = await createEventType({ name: marker }, owner)
      const association = await createNeighborhoodAssociation(
        { number: randomInt(1000000000, 2100000000), name: marker, active: true },
        owner,
      )
      const action = await createStrategicAction(
        {
          number: randomInt(1000000, 2000000),
          year: 2091,
          title: marker,
          topics: marker,
          implementation: marker,
          startDate: new Date("2091-01-01"),
          endDate: new Date("2091-12-31"),
        },
        owner,
      )
      await createActivity(
        { actionId: action.id, date: "2091-06-01", location: marker, objective: marker, participants: marker },
        owner,
      )
      const request = await createRequest(createRequestSchema.parse({ channel: marker }), owner)
      const delivery = await createDelivery(
        createDeliverySchema.parse({
          beneficiary: marker,
          beneficiaryRut: "12345678-5",
          neighborhoodAssociationId: association.id,
          address: marker,
          date: "2091-06-01",
          requestId: request.id,
          items: [{ supplyId: supply.id, quantity: 1 }],
        }),
        owner,
      )
      const event = await createEvent(
        {
          typeId: type.id,
          date: "2091-06-01",
          address: marker,
          institutions: "",
          actions: "",
          affectedCount: null,
          requestId: request.id,
        },
        actor,
      )
      const linked = await prisma.auditLog.findMany({
        where: {
          operationId: (await prisma.auditLog.findFirstOrThrow({ where: { resource: "events", entityId: event.id } }))
            .operationId,
        },
      })
      assert.ok(
        linked.some((row) => row.resource === "requests" && row.entityId === request.id && row.actorId === actor),
      )
      assert.ok(
        linked.some((row) => row.resource === "deliveries" && row.entityId === delivery.id && row.actorId === actor),
      )
      await updateDelivery(delivery.id, { items: [{ supplyId: supply.id, quantity: 3 }] }, actor)
      assert.ok(
        await prisma.auditLog.findFirst({
          where: {
            resource: "deliveries",
            entityId: delivery.id,
            entityLabel: { startsWith: "Insumos de" },
            actorId: actor,
          },
        }),
      )
      const blockedCount = await prisma.auditLog.count({ where: { actorId: actor } })
      await assert.rejects(deleteSupply(supply.id, actor))
      assert.equal(await prisma.auditLog.count({ where: { actorId: actor } }), blockedCount)
      await deleteEvent(event.id, await getEventDeletionImpact(event.id), actor)
      assert.ok(
        await prisma.auditLog.findFirst({ where: { resource: "events", action: "delete", entityId: event.id } }),
      )
      await updateRequest(request.id, { description: "Nueva descripción" }, actor)
      await deleteDelivery(delivery.id, actor)
      assert.ok(
        await prisma.auditLog.findFirst({ where: { resource: "deliveries", action: "delete", entityId: delivery.id } }),
      )
      const emailDomain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl").trim().toLowerCase()
      const user = await createUser(
        { name: marker, lastName: "Prueba", email: `${marker}@${emailDomain}`, role: "regular", password },
        owner,
      )
      await updateUser(user.id, { name: marker, lastName: "Editado", role: "regular" }, owner)
      await resetUserPassword(user.id, password, owner)
      await setUserActive(user.id, false, owner)
      await deleteUser(user.id, owner)
      const logs = await prisma.auditLog.findMany({ where: { actorId: { in: [actor, owner] } } })
      const serialized = JSON.stringify(logs)
      assert.ok(!serialized.includes(password))
      assert.ok(!serialized.includes('"password":'))
      assert.ok(!serialized.includes('"token":'))
      assert.ok(logs.some((row) => (row.after as Record<string, unknown> | null)?.passwordReset === true))
      for (const resource of [
        "deliveries",
        "supplies",
        "event-types",
        "neighborhood-associations",
        "strategic-actions",
        "activities",
        "requests",
        "events",
        "users",
      ])
        assert.ok(
          logs.some((row) => row.resource === resource),
          resource,
        )
      const filtered = await listAudit({ actorId: actor, resource: "supplies", action: "update" })
      assert.equal(filtered.data.length, 1)
      const [day] = await prisma.$queryRaw<
        { day: string }[]
      >`SELECT to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS day`
      assert.ok(
        (await listAudit({ actorId: actor, from: day.day, to: day.day })).data.some((row) => row.id === edit.id),
      )
      await prisma.user.delete({ where: { id: actor } })
      assert.equal((await prisma.auditLog.findUniqueOrThrow({ where: { id: edit.id } })).actorName, actor)
      assert.ok((await getAuditActors()).some((row) => row.actorId === actor))
      // Las fechas de auditoría son instantes; en invierno el día chileno comienza a las 04:00 UTC.
      for (const createdAt of [
        "2026-07-01T03:59:59Z",
        "2026-07-01T04:00:00Z",
        "2026-07-02T03:59:59Z",
        "2026-07-02T04:00:00Z",
      ]) {
        await prisma.auditLog.create({
          data: {
            operationId: randomUUID(),
            actorId: owner,
            actorName: owner,
            actorEmail: `${owner}@example.invalid`,
            resource: "activities",
            action: "update",
            entityId: marker,
            entityLabel: marker,
            createdAt: new Date(createdAt),
          },
        })
      }
      assert.equal((await listAudit({ actorId: owner, from: "2026-07-01", to: "2026-07-01" })).data.length, 2)
      // Datos de prueba suficientes para verificar paginación sin duplicados.
      for (let i = 0; i < 55; i++)
        await auditedTransaction(owner, (tx) =>
          tx.supply.update({ where: { id: supply.id }, data: { type: `${marker}-${i}` } }),
        )
      const first = await listAudit({ actorId: owner })
      assert.equal(first.data.length, 50)
      assert.ok(first.nextCursor)
      const second = await listAudit({ actorId: owner, cursor: first.nextCursor })
      assert.ok(second.data.length > 0)
      assert.ok(!second.data.some((row) => first.data.some((prior) => prior.id === row.id)))
    } finally {
      await prisma.delivery.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.request.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.event.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.activity.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.eventType.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.supply.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: { in: [owner, actor] } } })
      await prisma.user.deleteMany({ where: { email: { startsWith: marker } } })
      await prisma.auditLog.deleteMany({ where: { actorId: { in: [owner, actor] } } })
      await prisma.$disconnect()
    }
  },
)
