import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { searchAll } from "./service"

test(
  "búsqueda global: módulos, RUT parcial, límite y navegación con datos reales",
  {
    skip: process.env.RUN_SEARCH_INTEGRATION !== "1",
  },
  async () => {
    const marker = `global-${randomUUID()}`
    const rut = "12345678-5"
    try {
      await prisma.user.create({ data: { id: marker, name: marker, email: `${marker}@example.invalid` } })
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2000000000), name: marker, active: false, createdBy: marker },
      })
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: marker } })
      const action = await prisma.strategicAction.create({
        data: {
          number: 1,
          year: 2092,
          title: marker,
          topics: marker,
          implementation: marker,
          startDate: new Date("2092-01-01"),
          endDate: new Date("2092-12-31"),
          createdBy: marker,
        },
      })
      const activity = await prisma.activity.create({
        data: {
          actionId: action.id,
          objective: marker,
          date: new Date("2092-06-15"),
          location: marker,
          participants: marker,
          createdBy: marker,
        },
      })
      const type = await prisma.eventType.create({ data: { name: marker, createdBy: marker } })
      const event = await prisma.event.create({
        data: {
          folio: `${marker}-event`,
          typeId: type.id,
          date: new Date("2092-06-15"),
          sector: marker,
          institutions: "privado-evento",
          actions: "",
          createdBy: marker,
        },
      })
      const request = await prisma.request.create({
        data: {
          folio: `${marker}-request`,
          channel: marker,
          description: `${marker}-solo-solicitud`,
          createdBy: marker,
        },
      })
      for (let i = 0; i < 7; i++)
        await prisma.delivery.create({
          data: {
            folio: `${marker}-${i}`,
            beneficiary: marker,
            beneficiaryRut: rut,
            address: marker,
            date: new Date(`2092-06-${String(i + 10).padStart(2, "0")}`),
            createdBy: marker,
          },
        })
      const admin = await searchAll(` ${marker.toUpperCase()} `, "admin")
      assert.equal(admin.groups.length, 7)
      assert.equal(admin.groups.find((group) => group.key === "deliveries")?.results.length, 5)
      assert.equal(admin.groups.find((group) => group.key === "deliveries")?.hasMore, true)
      for (const id of [association.id, supply.id, action.id, activity.id, request.id, event.id]) {
        const result = admin.groups.flatMap((group) => group.results).find((row) => row.id === id)
        assert.ok(result)
        assert.ok(result.href.endsWith(`/${id}`))
      }
      const regular = await searchAll(marker, "regular")
      assert.equal(regular.groups.length, 5)
      assert.ok(!JSON.stringify(regular).includes(request.id))
      assert.ok(!JSON.stringify(regular).includes(event.id))
      const privateResults = await searchAll(`${marker}-solo-solicitud`, "regular")
      assert.ok(privateResults.groups.every((group) => group.results.length === 0))
      for (const term of ["12.345.678-5", "123456785", "678-5", "6785"]) {
        const matches = (await searchAll(term, "regular")).groups.find((group) => group.key === "deliveries")
        assert.ok(matches?.results.some((row) => row.title === marker))
      }
      assert.ok((await searchAll(`${marker}-inexistente`, "admin")).groups.every((group) => group.results.length === 0))
    } finally {
      await prisma.delivery.deleteMany({ where: { createdBy: marker } })
      await prisma.request.deleteMany({ where: { createdBy: marker } })
      await prisma.event.deleteMany({ where: { createdBy: marker } })
      await prisma.eventType.deleteMany({ where: { createdBy: marker } })
      await prisma.activity.deleteMany({ where: { createdBy: marker } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: marker } })
      await prisma.supply.deleteMany({ where: { createdBy: marker } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: marker } })
      await prisma.user.deleteMany({ where: { id: marker } })
      await prisma.$disconnect()
    }
  },
)
