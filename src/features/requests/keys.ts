import type { ListRequestsQuery } from "./schemas"

export const requestKeys = {
  all: ["requests"] as const,
  options: () => [...requestKeys.all, "options"] as const,
  lists: () => [...requestKeys.all, "list"] as const,
  list: (query: ListRequestsQuery) => [...requestKeys.lists(), query] as const,
  details: () => [...requestKeys.all, "detail"] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
}
