import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { createDelivery, getDeliveryRecurrence } from "./service"
import { createDeliverySchema } from "./schemas"

test(
  "recurrencia cuenta por RUT y fecha inclusiva, sin bloquear nuevas entregas",
  {
    skip: process.env.RUN_DELIVERY_INTEGRATION !== "1",
  },
  async () => {
    const marker = `recurrence-${randomUUID()}`
    const now = new Date("2096-08-31T15:00:00Z")
    try {
      await prisma.user.create({ data: { id: marker, name: marker, email: `${marker}@example.invalid` } })
      for (const [suffix, date, beneficiaryRut] of [
        ["old", "2096-02-28", "12345678-5"],
        ["first", "2096-02-29", "12345678-5"],
        ["last", "2096-08-31", "12345678-5"],
        ["future", "2096-09-01", "12345678-5"],
        ["other", "2096-08-15", "6000000-K"],
        ["legacy", "2096-08-15", null],
      ] as const) {
        await prisma.delivery.create({
          data: {
            folio: `${marker}-${suffix}`,
            beneficiary: marker,
            beneficiaryRut,
            date: new Date(date),
            address: "Prueba",
            createdBy: marker,
          },
        })
      }
      const result = await getDeliveryRecurrence("12.345.678-5", now)
      assert.deepEqual(result, {
        count: 2,
        from: "2096-02-29",
        through: "2096-08-31",
        lastDate: "2096-08-31T00:00:00.000Z",
      })
      assert.equal((await getDeliveryRecurrence("6.000.000-k", now)).count, 1)
      assert.equal((await getDeliveryRecurrence("10000004-0", now)).count, 0)
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: marker } })
      const delivery = await createDelivery(
        createDeliverySchema.parse({
          beneficiary: "Otro nombre para el mismo RUT",
          beneficiaryRut: "123456785",
          date: "2096-08-31",
          address: "Prueba",
          items: [{ supplyId: supply.id, quantity: 1 }],
        }),
        marker,
      )
      assert.equal(delivery.beneficiaryRut, "12345678-5")
      assert.equal((await getDeliveryRecurrence("12345678-5", now)).count, 3)
    } finally {
      await prisma.delivery.deleteMany({ where: { createdBy: marker } })
      await prisma.supply.deleteMany({ where: { createdBy: marker } })
      await prisma.user.deleteMany({ where: { id: marker } })
      await prisma.$disconnect()
    }
  },
)
