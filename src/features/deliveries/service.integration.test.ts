import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDelivery,
  getDeliveryOptions,
  listDeliveries,
} from "./service"
import { createDeliverySchema, updateDeliverySchema } from "./schemas"
import { getRequest } from "@/features/requests/service"
import { deleteEvent, getEvent, getEventDeletionImpact } from "@/features/events/service"

// Usa fixtures aislados y los retira aun si una aserción falla. Requiere una DB
// de desarrollo con las migraciones aplicadas; nunca corre por defecto.
test(
  "CRUD, filtros, relaciones y altas concurrentes en PostgreSQL",
  { skip: process.env.RUN_DELIVERY_INTEGRATION !== "1", timeout: 60000 },
  async () => {
    const marker = `delivery-test-${randomUUID()}`
    const userId = marker
    try {
      await prisma.user.create({ data: { id: userId, name: marker, email: `${marker}@example.invalid` } })
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: marker, createdBy: userId },
      })
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: userId } })
      const secondSupply = await prisma.supply.create({ data: { type: marker, unit: "caja", createdBy: userId } })
      const type = await prisma.eventType.create({ data: { name: marker, createdBy: userId } })
      const event = await prisma.event.create({
        data: {
          folio: marker,
          date: new Date("2026-10-14"),
          sector: marker,
          institutions: "Test",
          actions: "Test",
          typeId: type.id,
          createdBy: userId,
        },
      })
      const request = await prisma.request.create({
        data: { folio: marker, channel: "Test", eventId: event.id, createdBy: userId },
      })
      const input = createDeliverySchema.parse({
        beneficiary: marker,
        beneficiaryRut: "12345678-5",
        neighborhoodAssociationId: association.id,
        address: "Calle de prueba",
        date: "2026-10-14",
        requestId: request.id,
        items: [{ supplyId: supply.id, quantity: 2 }],
      })
      const direct = await createDelivery({ ...input, requestId: null, eventId: event.id }, userId)
      assert.equal(direct.eventId, event.id)
      assert.equal(direct.requestId, null)
      assert.ok((await getDeliveryOptions()).events.some((option) => option.id === event.id))
      assert.equal((await getEvent(event.id)).deliveries[0].items[0].quantity, 2)
      assert.equal((await updateDelivery(direct.id, { beneficiary: `${marker}-edit` }, userId)).eventId, event.id)
      // El formulario general envía requestId null al editar una entrega directa.
      assert.equal((await updateDelivery(direct.id, { requestId: null }, userId)).eventId, event.id)
      const otherEvent = await prisma.event.create({
        data: {
          folio: `${marker}-other`,
          date: new Date("2026-10-15"),
          sector: marker,
          institutions: "",
          actions: "",
          typeId: type.id,
          createdBy: userId,
        },
      })
      await assert.rejects(
        createDelivery({ ...input, eventId: otherEvent.id }, userId),
        (error: unknown) => error instanceof AppError && error.status === 409 && Boolean(error.fieldErrors?.requestId),
      )
      await assert.rejects(
        createDelivery({ ...input, requestId: null, eventId: "cm00000000000000000000000" }, userId),
        (error: unknown) => error instanceof AppError && error.status === 409 && Boolean(error.fieldErrors?.eventId),
      )
      const previousImpact = await getEventDeletionImpact(otherEvent.id)
      assert.equal((await updateDelivery(direct.id, { eventId: otherEvent.id }, userId)).eventId, otherEvent.id)
      await assert.rejects(
        deleteEvent(otherEvent.id, previousImpact, userId),
        (error: unknown) => error instanceof AppError && error.status === 409,
      )
      const directImpact = await getEventDeletionImpact(otherEvent.id)
      assert.deepEqual(directImpact.deliveryIds, [direct.id])
      assert.deepEqual(directImpact.requestIds, [])
      await deleteEvent(otherEvent.id, directImpact, userId)
      assert.equal((await getDelivery(direct.id)).eventId, null)
      assert.equal((await getDelivery(direct.id)).items[0].quantity, 2)
      await deleteDelivery(direct.id, userId)
      const withoutAssociation = await createDelivery(
        { ...input, beneficiaryRut: "12.345.678-5", requestId: null, neighborhoodAssociationId: null },
        userId,
      )
      assert.equal(withoutAssociation.beneficiaryRut, "12345678-5")
      assert.equal(withoutAssociation.neighborhoodAssociation, null)
      assert.equal((await listDeliveries({ q: marker })).stats.neighborhoods, 0)
      assert.equal(
        (await updateDelivery(withoutAssociation.id, { neighborhoodAssociationId: association.id }, userId))
          .neighborhoodAssociationId,
        association.id,
      )
      assert.equal(
        (await updateDelivery(withoutAssociation.id, { neighborhoodAssociationId: null }, userId))
          .neighborhoodAssociation,
        null,
      )
      assert.equal(
        (await updateDelivery(withoutAssociation.id, { contact: "123" }, userId)).beneficiaryRut,
        "12345678-5",
      )
      await prisma.delivery.update({ where: { id: withoutAssociation.id }, data: { beneficiaryRut: null } })
      assert.equal((await getDelivery(withoutAssociation.id)).beneficiaryRut, null)
      assert.equal((await listDeliveries({ q: marker })).data.length, 1)
      assert.equal((await listDeliveries({ q: marker, beneficiaryRut: "12345678-5" })).data.length, 0)
      await assert.rejects(
        updateDelivery(withoutAssociation.id, { contact: "456" }, userId),
        (error: unknown) => error instanceof AppError && Boolean(error.fieldErrors?.beneficiaryRut),
      )
      assert.equal(
        (await updateDelivery(withoutAssociation.id, { beneficiaryRut: "6.000.000-k" }, userId)).beneficiaryRut,
        "6000000-K",
      )
      await deleteDelivery(withoutAssociation.id, userId)
      const delivery = await createDelivery({ ...input, eventId: event.id }, userId)
      assert.equal(delivery.eventId, event.id)
      const linkedRequest = await getRequest(request.id)
      assert.equal(linkedRequest.delivery?.id, delivery.id)
      assert.equal(linkedRequest.status, request.status)
      assert.equal(delivery.contact, null)
      assert.equal(delivery.items[0].quantity, 2)
      assert.equal((await getDelivery(delivery.id)).creator.name, marker)
      await assert.rejects(
        updateDelivery(delivery.id, { eventId: null }, userId),
        (error: unknown) => error instanceof AppError && error.status === 409,
      )
      await assert.rejects(
        createDelivery(input, userId),
        (error: unknown) => error instanceof AppError && error.status === 409 && Boolean(error.fieldErrors?.requestId),
      )
      const options = await getDeliveryOptions()
      assert.equal(options.requests.find((row) => row.id === request.id)?.delivery?.id, delivery.id)
      const eventOption = options.events.find((row) => row.id === event.id)
      assert.ok(eventOption)
      assert.deepEqual(Object.keys(eventOption).sort(), ["folio", "id", "sector"])
      for (const term of ["12.345.678-5", "123456785", "345.678", "678-5", "6785"]) {
        assert.deepEqual(
          (await listDeliveries({ q: term, beneficiary: marker.toUpperCase() })).data.map((row) => row.id),
          [delivery.id],
        )
        assert.deepEqual(
          (await listDeliveries({ q: marker, beneficiaryRut: term, eventId: event.id })).data.map((row) => row.id),
          [delivery.id],
        )
      }
      const combined = await listDeliveries({
        q: marker,
        beneficiary: marker.toUpperCase(),
        beneficiaryRut: "678-5",
        eventId: event.id,
        neighborhoodAssociationId: association.id,
        supplyId: supply.id,
        from: "2026-10-14",
        to: "2026-10-14",
      })
      assert.deepEqual(combined.stats, { deliveries: 1, units: 2, neighborhoods: 1 })
      assert.equal((await listDeliveries({ q: marker, beneficiary: "No coincide" })).data.length, 0)
      assert.equal((await listDeliveries({ q: marker, beneficiaryRut: "000000000" })).data.length, 0)
      assert.equal((await listDeliveries({ q: marker, beneficiaryRut: "texto" })).data.length, 0)
      assert.deepEqual((await listDeliveries({ q: marker, eventId: event.id, event: "without" })).stats, {
        deliveries: 0,
        units: 0,
        neighborhoods: 0,
      })
      await updateDelivery(delivery.id, { beneficiaryRut: "6000000-K" }, userId)
      assert.equal((await listDeliveries({ beneficiary: marker, beneficiaryRut: "0-k" })).data[0]?.id, delivery.id)
      await updateDelivery(delivery.id, { beneficiaryRut: "12345678-5" }, userId)
      const query = { q: marker, from: "2026-10-14", to: "2026-10-14", event: "with" as const, supplyId: supply.id }
      const listed = await listDeliveries(query)
      assert.equal(listed.stats.deliveries, 1)
      assert.equal(listed.stats.units, 2)
      assert.equal(listed.stats.neighborhoods, 1)
      assert.equal((await listDeliveries({ ...query, from: "2026-10-15", to: "2026-10-15" })).data.length, 0)
      assert.equal((await listDeliveries({ ...query, event: "without" })).data.length, 0)
      const edited = await updateDelivery(
        delivery.id,
        updateDeliverySchema.parse({ contact: "123", items: [{ supplyId: secondSupply.id, quantity: 5 }] }),
        userId,
      )
      assert.equal(edited.items.length, 1)
      assert.equal(edited.items[0].supplyId, secondSupply.id)
      assert.equal(edited.requestId, request.id)
      await assert.rejects(
        updateDelivery(
          delivery.id,
          updateDeliverySchema.parse({ items: [{ supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx", quantity: 1 }] }),
          userId,
        ),
        AppError,
      )
      assert.equal((await getDelivery(delivery.id)).items[0].quantity, 5)
      const detached = await updateDelivery(delivery.id, { requestId: null, contact: null }, userId)
      assert.equal(detached.eventId, null)
      assert.equal(detached.requestId, null)
      const independent = { ...input, requestId: null }
      const concurrent = await Promise.all([createDelivery(independent, userId), createDelivery(independent, userId)])
      assert.notEqual(concurrent[0].folio, concurrent[1].folio)
      const races = await Promise.allSettled([createDelivery(input, userId), createDelivery(input, userId)])
      assert.equal(races.filter((result) => result.status === "fulfilled").length, 1)
      await deleteDelivery(delivery.id, userId)
      await assert.rejects(
        getDelivery(delivery.id),
        (error: unknown) => error instanceof AppError && error.status === 404,
      )
      assert.ok(await prisma.request.findUnique({ where: { id: request.id } }))
      assert.ok(await prisma.event.findUnique({ where: { id: event.id } }))
      assert.ok(await prisma.supply.findUnique({ where: { id: supply.id } }))
    } finally {
      await prisma.delivery.deleteMany({ where: { createdBy: userId } })
      await prisma.request.deleteMany({ where: { createdBy: userId } })
      await prisma.event.deleteMany({ where: { createdBy: userId } })
      await prisma.supply.deleteMany({ where: { createdBy: userId } })
      await prisma.eventType.deleteMany({ where: { createdBy: userId } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
      await prisma.auditLog.deleteMany({ where: { actorId: userId } })
      await prisma.$disconnect()
    }
  },
)
