import type { AssociationHistoryQuery, ListNeighborhoodAssociationsQuery } from "./schemas"
export const neighborhoodAssociationKeys = {
  all: ["neighborhood-associations"] as const,
  lists: () => [...neighborhoodAssociationKeys.all, "list"] as const,
  list: (query: ListNeighborhoodAssociationsQuery) => [...neighborhoodAssociationKeys.lists(), query] as const,
  details: () => [...neighborhoodAssociationKeys.all, "detail"] as const,
  detail: (id: string) => [...neighborhoodAssociationKeys.details(), id] as const,
  history: (id: string, query: AssociationHistoryQuery) => [...neighborhoodAssociationKeys.detail(id), query] as const,
}
