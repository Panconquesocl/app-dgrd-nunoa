import assert from "node:assert/strict"
import { test } from "node:test"
import { activityClusters, yearPosition } from "./timeline"
import type { ActivityItem } from "./schemas"
test("posiciones UTC, año bisiesto, recorte y agrupación estable", () => {
  assert.equal(yearPosition("2024-01-01", 2024), 0)
  assert.equal(yearPosition("2025-01-01", 2024), 100)
  assert.equal(yearPosition("2023-12-01", 2024), 0)
  assert.equal(yearPosition("2024-07-02", 2024), 50)
  const items = ["2024-12-31", "2024-01-02", "2024-01-01", "2025-01-01"].map(
    (date, i) => ({ id: String(i), date }) as ActivityItem,
  )
  const clusters = activityClusters(items, 2024)
  assert.deepEqual(
    clusters.map((group) => group.items.length),
    [2, 1],
  )
  assert.equal(clusters[0].items[0].date, "2024-01-01")
  assert.equal(items[0].date, "2024-12-31")
})
