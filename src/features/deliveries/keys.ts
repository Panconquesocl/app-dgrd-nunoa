import type { ListDeliveriesQuery } from "./schemas"

export const deliveryKeys = {
  all: ["deliveries"] as const,
  options: () => ["deliveries", "options"] as const,
  lists: () => [...deliveryKeys.all, "list"] as const,
  list: (query: ListDeliveriesQuery) => [...deliveryKeys.lists(), query] as const,
  details: () => [...deliveryKeys.all, "detail"] as const,
  detail: (id: string) => [...deliveryKeys.details(), id] as const,
}
