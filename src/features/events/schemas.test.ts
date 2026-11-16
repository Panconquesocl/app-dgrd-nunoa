import assert from "node:assert/strict"
import { test } from "node:test"
import { eventSchema } from "./schemas"

test("Dirección reemplaza Sector: obligatoria, normalizada y limitada a 500 caracteres", () => {
  const base = { typeId: "cm12345678901234567890123", date: "2026-11-15", address: "  Av. Grecia 4500, Ñuñoa  " }
  assert.equal(eventSchema.parse(base).address, "Av. Grecia 4500, Ñuñoa")
  for (const address of [undefined, null, "", "  ", "a".repeat(501)]) {
    const result = eventSchema.safeParse({ ...base, address, sector: "Campo anterior" })
    assert.equal(result.success, false)
    if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path[0] === "address"))
  }
  assert.equal(eventSchema.safeParse({ ...base, address: "a".repeat(500) }).success, true)
  assert.equal(Object.hasOwn(eventSchema.parse(base), "sector"), false)
})
