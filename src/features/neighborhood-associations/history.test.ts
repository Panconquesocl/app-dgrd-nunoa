import assert from "node:assert/strict"
import { test } from "node:test"
import { summarizeAssociationHistory } from "./history"

test("desglose por identidad: no mezcla insumos de igual nombre con distinta unidad", () => {
  const kg = { id: "kg", type: "Alimento", unit: "kg" }
  const box = { id: "box", type: "Alimento", unit: "caja" }
  const water = { id: "water", type: "Agua", unit: "litro" }
  const summary = summarizeAssociationHistory([
    {
      items: [
        { supply: kg, quantity: 3 },
        { supply: box, quantity: 2 },
      ],
    },
    {
      items: [
        { supply: kg, quantity: 7 },
        { supply: water, quantity: 5 },
      ],
    },
  ])
  assert.equal(summary.filteredDeliveryCount, 2)
  assert.deepEqual(summary.supplyBreakdown, [
    { ...water, quantity: 5, deliveryCount: 1 },
    { ...box, quantity: 2, deliveryCount: 1 },
    { ...kg, quantity: 10, deliveryCount: 2 },
  ])
  assert.deepEqual(summary.totalsByUnit, [
    { unit: "caja", quantity: 2 },
    { unit: "kg", quantity: 10 },
    { unit: "litro", quantity: 5 },
  ])
})

test("desglose vacío y entregas legadas sin ítems", () => {
  assert.deepEqual(summarizeAssociationHistory([]), { filteredDeliveryCount: 0, supplyBreakdown: [], totalsByUnit: [] })
  assert.deepEqual(summarizeAssociationHistory([{ items: [] }]), {
    filteredDeliveryCount: 1,
    supplyBreakdown: [],
    totalsByUnit: [],
  })
})

test("cliente HTTP y caché distinguen periodo e insumo", async () => {
  const { getNeighborhoodAssociation } = await import("./api")
  const { neighborhoodAssociationKeys } = await import("./keys")
  const originalFetch = globalThis.fetch
  let requested = ""
  globalThis.fetch = async (url) => {
    requested = String(url)
    return Response.json({ id: "junta" })
  }
  try {
    const filters = {
      from: "2026-01-01",
      to: "2026-01-31",
      supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      order: "asc" as const,
    }
    await getNeighborhoodAssociation("junta", filters)
    const url = new URL(requested, "http://localhost")
    assert.equal(url.pathname, "/api/neighborhood-associations/junta")
    assert.deepEqual(Object.fromEntries(url.searchParams), filters)
    assert.notDeepEqual(
      neighborhoodAssociationKeys.history("junta", filters),
      neighborhoodAssociationKeys.history("junta", { ...filters, from: "2026-01-02" }),
    )
    assert.notDeepEqual(
      neighborhoodAssociationKeys.history("junta", filters),
      neighborhoodAssociationKeys.history("junta", { ...filters, supplyId: "clyyyyyyyyyyyyyyyyyyyyyyy" }),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
