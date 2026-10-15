import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createNeighborhoodAssociationSchema,
  updateNeighborhoodAssociationSchema,
  neighborhoodAssociationFormSchema,
  toNeighborhoodAssociationPayload,
  listNeighborhoodAssociationsQuerySchema,
} from "./schemas"
import { createDeliverySchema, updateDeliverySchema } from "@/features/deliveries/schemas"

test("valida número positivo, nombre y estado sin coerciones", () => {
  assert.deepEqual(createNeighborhoodAssociationSchema.parse({ number: 12, name: "  Villa Prueba  ", active: true }), {
    number: 12,
    name: "Villa Prueba",
    active: true,
  })
  for (const number of [0, -1, 1.5, "12", 2147483648])
    assert.equal(createNeighborhoodAssociationSchema.safeParse({ number, name: "Villa", active: true }).success, false)
  assert.equal(createNeighborhoodAssociationSchema.safeParse({ number: 12, name: "  ", active: true }).success, false)
  assert.equal(
    createNeighborhoodAssociationSchema.safeParse({ number: 12, name: "Villa", active: "true" }).success,
    false,
  )
})
test("el formulario convierte número string y PATCH conserva los omitidos", () => {
  const values = neighborhoodAssociationFormSchema.parse({ number: "12", name: "Villa", active: false })
  assert.deepEqual(toNeighborhoodAssociationPayload(values), { number: 12, name: "Villa", active: false })
  assert.deepEqual(updateNeighborhoodAssociationSchema.parse({ active: false }), { active: false })
  assert.equal(listNeighborhoodAssociationsQuerySchema.safeParse({ status: "invalid" }).success, false)
})
test("las entregas requieren una referencia CUID, no texto libre", () => {
  const input = {
    beneficiary: "Vecina",
    address: "Calle",
    date: "2026-10-14",
    items: [{ supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx", quantity: 1 }],
  }
  assert.equal(createDeliverySchema.safeParse({ ...input, jv: "JV 12" }).success, false)
  assert.equal(createDeliverySchema.safeParse({ ...input, neighborhoodAssociationId: "JV 12" }).success, false)
  assert.equal(
    createDeliverySchema.safeParse({ ...input, neighborhoodAssociationId: "clyyyyyyyyyyyyyyyyyyyyyyy" }).success,
    true,
  )
  assert.deepEqual(updateDeliverySchema.parse({ contact: null }), { contact: null })
})
