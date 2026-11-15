import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { currentSummaryYear, summaryToday, summaryYearSchema } from "./schemas"
import { getSummary } from "./service"
test("año válido y cambio de año según fecha de Chile", () => {
  for (const year of ["x", "2026.5", 1899, 2201]) assert.equal(summaryYearSchema.safeParse(year).success, false)
  assert.equal(summaryYearSchema.parse("2026"), 2026)
  assert.equal(currentSummaryYear(new Date("2026-01-01T02:30:00Z")), 2025)
  assert.equal(summaryToday(new Date("2026-01-01T02:30:00Z")), "2025-12-31")
})
test(
  "resumen anual: límites, unidades, prioridades, cuatro filas y datos según rol",
  { skip: process.env.RUN_SUMMARY_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const id = `summary-${randomUUID()}`,
      year = 2094
    await prisma.user.create({ data: { id, name: "Prueba", email: `${id}@example.invalid` } })
    try {
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: id, createdBy: id },
      })
      const [liters, units, blankets] = await Promise.all([
        ...["litro", "unidad"].map((unit) =>
          prisma.supply.create({ data: { type: `${id}-agua`, unit, createdBy: id } }),
        ),
        prisma.supply.create({ data: { type: `${id}-frazada`, unit: "unidad", createdBy: id } }),
      ])
      for (const [suffix, date, items] of [
        [
          "first",
          "2094-01-01",
          [
            { supplyId: liters.id, quantity: 10 },
            { supplyId: units.id, quantity: 3 },
          ],
        ],
        ["last", "2094-12-31", [{ supplyId: blankets.id, quantity: 4 }]],
        ["prior", "2093-12-31", [{ supplyId: liters.id, quantity: 1000 }]],
        ["next", "2095-01-01", [{ supplyId: liters.id, quantity: 1000 }]],
      ] as const) {
        await prisma.delivery.create({
          data: {
            folio: `${id}-${suffix}`,
            date: new Date(date),
            beneficiary: id,
            address: "Prueba",
            neighborhoodAssociationId: association.id,
            createdBy: id,
            items: { create: [...items] },
          },
        })
      }
      const action = await prisma.strategicAction.create({
        data: {
          number: 1,
          year,
          title: id,
          startDate: new Date("2094-01-01"),
          endDate: new Date("2094-12-31"),
          topics: "Prueba",
          implementation: "Prueba",
          createdBy: id,
        },
      })
      for (const date of [
        "2094-02-01",
        "2094-03-01",
        "2094-06-16",
        "2094-06-17",
        "2094-06-18",
        "2094-06-19",
        "2094-12-31",
      ]) {
        await prisma.activity.create({
          data: {
            date: new Date(date),
            actionId: action.id,
            objective: `${id}-${date}`,
            location: "Prueba",
            participants: "Prueba",
            createdBy: id,
          },
        })
      }
      const type = await prisma.eventType.create({ data: { name: id, createdBy: id } })
      for (const [suffix, date] of [
        ["recent", "2094-12-31"],
        ["previous", "2093-12-31"],
        ["private", "2188-01-01"],
      ]) {
        await prisma.event.create({
          data: {
            folio: `${id}-${suffix}`,
            date: new Date(date),
            sector: `${id}-private`,
            typeId: type.id,
            institutions: "Prueba",
            actions: "Prueba",
            createdBy: id,
          },
        })
      }
      for (const [suffix, createdAt, status] of [
        ["excluded", "2094-01-01T02:59:00Z", "pending"],
        ["included", "2094-01-01T03:00:00Z", "pending"],
        ["late", "2095-01-01T02:59:00Z", "pending"],
        ["next", "2095-01-01T03:00:00Z", "pending"],
        ["attended", "2094-10-01T12:00:00Z", "attended"],
        ["cancelled", "2094-11-01T12:00:00Z", "cancelled"],
        ["private", "2189-01-01T12:00:00Z", "pending"],
      ] as const) {
        await prisma.request.create({
          data: {
            folio: `${id}-${suffix}`,
            channel: `${id}-private`,
            status,
            createdAt: new Date(createdAt),
            createdBy: id,
          },
        })
      }
      const now = new Date("2094-06-15T15:00:00Z")
      const admin = await getSummary(year, "admin", now)
      assert.equal(admin.deliveries.count, 2)
      assert.deepEqual(admin.deliveries.totalsByUnit, [
        { unit: "litro", quantity: 10 },
        { unit: "unidad", quantity: 7 },
      ])
      assert.equal(admin.supplies.distributedCount, 3)
      assert.equal(admin.supplies.top.length, 3)
      assert.equal(admin.supplies.top[0].id, liters.id)
      assert.equal(admin.actions.count, 1)
      assert.equal(admin.actions.recent[0]._count.activities, 7)
      assert.equal(admin.activities.count, 7)
      assert.equal(admin.activities.agenda.length, 4)
      assert.ok(admin.activities.agenda.every((row) => row.upcoming))
      assert.equal(admin.activities.agenda[0].date.toISOString().slice(0, 10), "2094-06-16")
      assert.equal(admin.events?.count, 1)
      assert.equal(admin.requests?.count, 4)
      assert.equal(admin.requests?.pending, 2)
      assert.deepEqual(
        admin.requests?.recent.map((row) => row.status),
        ["pending", "pending", "cancelled", "attended"],
      )
      const regular = await getSummary(year, "regular", now)
      assert.equal("events" in regular, false)
      assert.equal("requests" in regular, false)
      assert.equal(regular.availableYears.includes(2188), false)
      assert.equal(regular.availableYears.includes(2189), false)
      assert.ok(admin.availableYears.includes(2188))
      assert.ok(admin.availableYears.includes(2189))
      assert.equal(JSON.stringify(regular).includes(`${id}-private`), false)
      assert.deepEqual(regular.deliveries, admin.deliveries)
      const past = await getSummary(year, "regular", new Date("2095-01-15T12:00:00Z"))
      assert.equal(past.activities.agenda[0].date.toISOString().slice(0, 10), "2094-12-31")
      assert.ok(past.activities.agenda.every((row) => !row.upcoming))
      const empty = await getSummary(2199, "regular", now)
      assert.equal(empty.deliveries.count, 0)
      assert.deepEqual(empty.deliveries.totalsByUnit, [])
      assert.deepEqual(empty.activities.agenda, [])
      await assert.rejects(
        getSummary(year, "unknown", now),
        (error) => error instanceof AppError && error.status === 403,
      )
    } finally {
      await prisma.deliveryItem.deleteMany({ where: { delivery: { createdBy: id } } })
      await prisma.delivery.deleteMany({ where: { createdBy: id } })
      await prisma.request.deleteMany({ where: { createdBy: id } })
      await prisma.event.deleteMany({ where: { createdBy: id } })
      await prisma.eventType.deleteMany({ where: { createdBy: id } })
      await prisma.activity.deleteMany({ where: { createdBy: id } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: id } })
      await prisma.supply.deleteMany({ where: { createdBy: id } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: id } })
      await prisma.user.delete({ where: { id } })
      await prisma.$disconnect()
    }
  },
)
