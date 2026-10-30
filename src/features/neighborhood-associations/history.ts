import type { AssociationSupply, AssociationSupplySummary } from "./schemas"

/** Aggregate quantities without mixing units or counting one delivery twice per supply. */
export function summarizeAssociationHistory(
  deliveries: {
    items: { quantity: number; supply: AssociationSupply }[]
  }[],
) {
  const supplies = new Map<string, AssociationSupplySummary>()
  const units = new Map<string, number>()
  for (const delivery of deliveries) {
    const seen = new Set<string>()
    for (const { supply, quantity } of delivery.items) {
      const summary = supplies.get(supply.id) ?? { ...supply, quantity: 0, deliveryCount: 0 }
      summary.quantity += quantity
      if (!seen.has(supply.id)) summary.deliveryCount++
      seen.add(supply.id)
      supplies.set(supply.id, summary)
      units.set(supply.unit, (units.get(supply.unit) ?? 0) + quantity)
    }
  }
  return {
    filteredDeliveryCount: deliveries.length,
    supplyBreakdown: [...supplies.values()].sort(
      (a, b) => a.type.localeCompare(b.type, "es") || a.unit.localeCompare(b.unit, "es") || a.id.localeCompare(b.id),
    ),
    totalsByUnit: [...units]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([unit, quantity]) => ({ unit, quantity })),
  }
}
