import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createSupplySchema,
  updateSupplySchema,
  supplyFormSchema,
  SUPPLY_UNITS,
  listSuppliesQuerySchema,
  supplyHistoryQuerySchema,
} from "./schemas"

test("normaliza el nombre y conserva su presentación", () => {
  assert.deepEqual(createSupplySchema.parse({ type: "  Frazada  ", unit: "unidad" }), {
    type: "Frazada",
    unit: "unidad",
  })
  for (const type of ["", "   ", "a".repeat(201)])
    assert.equal(createSupplySchema.safeParse({ type, unit: "unidad" }).success, false)
})
test("solo permite las unidades del catálogo del spike", () => {
  for (const unit of SUPPLY_UNITS) assert.equal(createSupplySchema.safeParse({ type: "Agua", unit }).success, true)
  for (const unit of ["Kg", "kilogramos", "", "unidad ", null])
    assert.equal(createSupplySchema.safeParse({ type: "Agua", unit }).success, false)
})
test("PATCH mantiene omitidos los campos no enviados", () => {
  assert.deepEqual(updateSupplySchema.parse({ type: "Agua potable" }), { type: "Agua potable" })
  assert.deepEqual(updateSupplySchema.parse({ unit: "caja" }), { unit: "caja" })
  assert.equal(updateSupplySchema.safeParse({ type: " " }).success, false)
})
test("el formulario y el servidor comparten el contrato sin coerciones", () => {
  const values = supplyFormSchema.parse({ type: "Agua", unit: "litro" })
  assert.deepEqual(createSupplySchema.parse(values), values)
})
test("valida búsqueda y orden del historial", () => {
  assert.deepEqual(listSuppliesQuerySchema.parse({ q: "  Agua " }), { q: "Agua" })
  assert.equal(supplyHistoryQuerySchema.parse({}).order, "desc")
  assert.equal(supplyHistoryQuerySchema.safeParse({ order: "invalid" }).success, false)
})
