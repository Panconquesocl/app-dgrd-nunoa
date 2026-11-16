import assert from "node:assert/strict"
import { test } from "node:test"
import { deliveryRecurrenceWindow } from "./recurrence"

test("recurrencia usa hoy en Chile y no el día UTC", () => {
  const result = deliveryRecurrenceWindow(new Date("2026-11-16T02:59:59Z"))
  assert.equal(result.through, "2026-11-15")
  assert.equal(result.from, "2026-05-15")
  assert.equal(result.end.toISOString(), "2026-11-16T00:00:00.000Z")
})
test("seis meses calendario ajustan el día al fin de mes, incluyendo años bisiestos", () => {
  for (const [now, from] of [
    ["2026-08-31T15:00:00Z", "2026-02-28"],
    ["2024-08-31T15:00:00Z", "2024-02-29"],
    ["2026-01-31T15:00:00Z", "2025-07-31"],
    ["2026-12-31T15:00:00Z", "2026-06-30"],
  ])
    assert.equal(deliveryRecurrenceWindow(new Date(now)).from, from)
})
