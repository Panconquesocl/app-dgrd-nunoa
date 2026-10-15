"use client"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import { neighborhoodAssociationKeys } from "./keys"
import { supplyKeys } from "@/features/supplies/keys"
import { deliveryKeys } from "@/features/deliveries/keys"
import type {
  ListNeighborhoodAssociationsQuery,
  NeighborhoodAssociationPayload,
  NeighborhoodAssociationPatch,
} from "./schemas"

export function useNeighborhoodAssociations(query: ListNeighborhoodAssociationsQuery = {}) {
  return useQuery({
    queryKey: neighborhoodAssociationKeys.list(query),
    queryFn: () => api.listNeighborhoodAssociations(query),
    placeholderData: keepPreviousData,
  })
}
export function useNeighborhoodAssociation(id: string, order: "asc" | "desc" = "desc") {
  return useQuery({
    queryKey: neighborhoodAssociationKeys.history(id, order),
    queryFn: () => api.getNeighborhoodAssociation(id, order),
    enabled: Boolean(id),
  })
}
function useInvalidateNeighborhoodAssociations() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all }),
      // El nombre se resuelve desde el catálogo, también en entregas históricas.
      client.invalidateQueries({ queryKey: deliveryKeys.all }),
      client.invalidateQueries({ queryKey: supplyKeys.all }),
    ])
}
export function useCreateNeighborhoodAssociation() {
  const invalidate = useInvalidateNeighborhoodAssociations()
  return useMutation({
    mutationFn: (payload: NeighborhoodAssociationPayload) => api.createNeighborhoodAssociation(payload),
    onSuccess: invalidate,
  })
}
export function useUpdateNeighborhoodAssociation(id: string) {
  const invalidate = useInvalidateNeighborhoodAssociations()
  return useMutation({
    mutationFn: (payload: NeighborhoodAssociationPatch) => api.updateNeighborhoodAssociation(id, payload),
    onSuccess: invalidate,
  })
}
export function useDeleteNeighborhoodAssociation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteNeighborhoodAssociation,
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: neighborhoodAssociationKeys.detail(id) })
      return Promise.all([
        client.invalidateQueries({ queryKey: neighborhoodAssociationKeys.lists() }),
        client.invalidateQueries({ queryKey: deliveryKeys.all }),
        client.invalidateQueries({ queryKey: supplyKeys.all }),
      ])
    },
  })
}
