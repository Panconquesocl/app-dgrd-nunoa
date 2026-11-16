import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { eventTypeSchema } from "./schemas"
import { createEventType, deleteEventType, listEventTypes, updateEventType } from "./service"

test("nombre requerido, normalización y límite", () => {
  assert.deepEqual(eventTypeSchema.parse({ name: "  Incendio  " }), { name: "Incendio" })
  for (const name of ["", "  ", "x".repeat(201), undefined])
    assert.equal(eventTypeSchema.safeParse({ name }).success, false)
})
test(
  "unicidad concurrente, renombrado y bloqueo de tipos en uso",
  { skip: process.env.RUN_EVENT_TYPE_INTEGRATION !== "1" },
  async () => {
    const id = `event-types-${randomUUID()}`
    const conflict = (error: unknown) => error instanceof AppError && error.status === 409
    await prisma.user.create({ data: { id, name: "Prueba", email: `${id}@example.invalid` } })
    try {
      const results = await Promise.allSettled([
        createEventType(eventTypeSchema.parse({ name: id }), id),
        createEventType(eventTypeSchema.parse({ name: `  ${id.toUpperCase()} ` }), id),
      ])
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
      const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult
      assert.ok(conflict(rejected.reason))
      const type = (await listEventTypes()).data.find((row) => row.name.toLowerCase() === id)!
      const second = await createEventType({ name: `${id}-otro` }, id)
      await assert.rejects(updateEventType(second.id, { name: id.toUpperCase() }, id), conflict)
      const event = await prisma.event.create({
        data: {
          folio: id,
          typeId: type.id,
          date: new Date(),
          sector: "Prueba",
          institutions: "Prueba",
          actions: "Prueba",
          createdBy: id,
        },
      })
      assert.equal((await listEventTypes()).data.find((row) => row.id === type.id)?._count.events, 1)
      await updateEventType(type.id, { name: `${id}-renombrado` }, id)
      assert.equal(
        (await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: { type: true } })).type.name,
        `${id}-renombrado`,
      )
      await assert.rejects(deleteEventType(type.id, id), conflict)
      await assert.rejects(prisma.eventType.delete({ where: { id: type.id } }))
      assert.ok(await prisma.event.findUnique({ where: { id: event.id } }))
      await deleteEventType(second.id, id)
      assert.equal(await prisma.eventType.findUnique({ where: { id: second.id } }), null)
    } finally {
      await prisma.event.deleteMany({ where: { createdBy: id } })
      await prisma.eventType.deleteMany({ where: { createdBy: id } })
      await prisma.user.delete({ where: { id } })
      await prisma.auditLog.deleteMany({ where: { actorId: id } })
      await prisma.$disconnect()
    }
  },
)
