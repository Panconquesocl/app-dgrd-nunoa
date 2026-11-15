import assert from "node:assert/strict"
import { test } from "node:test"
import { formatActivityDateLong, formatActivityRecordDate } from "./format"
test("registro con mes abreviado y hora 24h de Chile; fecha calendario sin corrimiento", () => {
  assert.equal(formatActivityRecordDate("2026-10-09T18:05:00Z"), "9 oct 2026, 15:05")
  assert.equal(formatActivityRecordDate("2026-10-09T03:05:00Z"), "9 oct 2026, 00:05")
  assert.equal(formatActivityDateLong("2026-10-09T00:00:00Z"), "9 de octubre de 2026")
})
