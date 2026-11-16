import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { createRequest, updateRequest } from "@/features/requests/service"
import { createRequestSchema } from "@/features/requests/schemas"
import { createDelivery } from "@/features/deliveries/service"
import { createDeliverySchema } from "@/features/deliveries/schemas"
import { createEventSchema, eventFormSchema, eventSchema } from "./schemas"
import { createEvent, deleteEvent, getEvent, getEventDeletionImpact, listEvents, updateEvent } from "./service"
test("validaciones de evento: campos, fechas, afectados opcionales y formulario", () => {
  const base = { typeId: "cm12345678901234567890123", date: "2026-11-15", sector: " Villa Frei " }
  const parsed = eventSchema.parse(base)
  assert.equal(parsed.sector, "Villa Frei")
  assert.equal(parsed.affectedCount, null)
  assert.equal(parsed.institutions, "")
  for (const affectedCount of [-1, 1.5, 2147483648, "2"])
    assert.equal(eventSchema.safeParse({ ...base, affectedCount }).success, false)
  for (const date of ["2026-02-30", "2026-11-15T12:00:00Z", ""])
    assert.equal(eventSchema.safeParse({ ...base, date }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, sector: " " }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, typeId: "x" }).success, false)
  assert.equal(eventFormSchema.safeParse({ ...parsed, affectedCount: "" }).success, true)
  assert.equal(eventFormSchema.safeParse({ ...parsed, affectedCount: "1.5" }).success, false)
})
test(
  "eventos: folios, asociación contextual atómica, advertencia y conservación de registros",
  { skip: process.env.RUN_EVENTS_INTEGRATION !== "1" },
  async () => {
    const userId = `events-${randomUUID()}`
    const conflict = (error: unknown) => error instanceof AppError && error.status === 409
    await prisma.user.create({ data: { id: userId, name: "Prueba", email: `${userId}@example.invalid` } })
    try {
      const type = await prisma.eventType.create({ data: { name: userId, createdBy: userId } })
      const base = eventSchema.parse({ typeId: type.id, date: "2026-11-15", sector: userId })
      const [first, second] = await Promise.all([createEvent(base, userId), createEvent(base, userId)])
      assert.notEqual(first.folio, second.folio)
      assert.match(first.folio, /^EV-\d{4}-\d{3,}$/)
      const newest = [first, second].sort((a, b) => Number(a.folio.split("-")[2]) - Number(b.folio.split("-")[2]))[1]
      await deleteEvent(newest.id, await getEventDeletionImpact(newest.id), userId)
      const after = await createEvent(base, userId)
      assert.equal(Number(after.folio.split("-")[2]), Number(newest.folio.split("-")[2]) + 1)
      const request = await createRequest(createRequestSchema.parse({ channel: "Teléfono" }), userId)
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: userId, createdBy: userId },
      })
      const supply = await prisma.supply.create({ data: { type: userId, unit: "unidad", createdBy: userId } })
      const delivery = await createDelivery(
        createDeliverySchema.parse({
          beneficiary: "Prueba",
          beneficiaryRut: "12345678-5",
          neighborhoodAssociationId: association.id,
          date: "2026-11-15",
          address: "Prueba",
          requestId: request.id,
          items: [{ supplyId: supply.id, quantity: 2 }],
        }),
        userId,
      )
      const contextual = await createEvent(createEventSchema.parse({ ...base, requestId: request.id }), userId)
      assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: request.id } })).eventId, contextual.id)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, contextual.id)
      assert.equal((await getEvent(contextual.id)).requests.length, 1)
      assert.equal((await getEvent(contextual.id)).deliveries.length, 1)
      const countBefore = (await listEvents()).data.filter((event) => event.sector === userId).length
      await assert.rejects(createEvent({ ...base, requestId: request.id }, userId), conflict)
      assert.equal((await listEvents()).data.filter((event) => event.sector === userId).length, countBefore)
      await updateEvent(contextual.id, { ...base, affectedCount: 0, actions: "Acción actualizada" }, userId)
      assert.equal((await getEvent(contextual.id)).affectedCount, 0)
      const seen = await getEventDeletionImpact(contextual.id)
      await createRequest(createRequestSchema.parse({ channel: "Correo", eventId: contextual.id }), userId)
      await assert.rejects(deleteEvent(contextual.id, seen, userId), conflict)
      await deleteEvent(contextual.id, await getEventDeletionImpact(contextual.id), userId)
      assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: request.id } })).eventId, null)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, null)
      assert.equal(await prisma.deliveryItem.count({ where: { deliveryId: delivery.id } }), 1)
      const empty = await createEvent(base, userId)
      await updateRequest(request.id, { eventId: empty.id }, userId)
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, empty.id)
      await assert.rejects(createEvent({ ...base, typeId: "cm00000000000000000000000" }, userId), conflict)
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
