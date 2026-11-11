import type { ListSuppliesQuery } from "./schemas"

export const supplyKeys = {
  all: ["supplies"] as const,
  lists: () => [...supplyKeys.all, "list"] as const,
  list: (query: ListSuppliesQuery) => [...supplyKeys.lists(), query] as const,
  details: () => [...supplyKeys.all, "detail"] as const,
  detail: (id: string) => [...supplyKeys.details(), id] as const,
  history: (id: string, order: "asc" | "desc") => [...supplyKeys.detail(id), { order }] as const,
}
