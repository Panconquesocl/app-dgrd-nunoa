"use client"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import { supplyKeys } from "./keys"
import { neighborhoodAssociationKeys } from "@/features/neighborhood-associations/keys"
import { deliveryKeys } from "@/features/deliveries/keys"
import type { ListSuppliesQuery, SupplyPayload, SupplyPatch } from "./schemas"

export function useSupplies(query: ListSuppliesQuery = {}) {
  return useQuery({
    queryKey: supplyKeys.list(query),
    queryFn: () => api.listSupplies(query),
    placeholderData: keepPreviousData,
  })
}
export function useSupply(id: string, order: "asc" | "desc" = "desc") {
  return useQuery({
    queryKey: supplyKeys.history(id, order),
    queryFn: () => api.getSupply(id, order),
    enabled: Boolean(id),
  })
}
function useInvalidateSupplies() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["summary"] }),
      client.invalidateQueries({ queryKey: supplyKeys.all }),
      // El nombre se resuelve desde el catálogo, también en entregas históricas.
      client.invalidateQueries({ queryKey: deliveryKeys.all }),
      client.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all }),
    ])
}
export function useCreateSupply() {
  const invalidate = useInvalidateSupplies()
  return useMutation({ mutationFn: (payload: SupplyPayload) => api.createSupply(payload), onSuccess: invalidate })
}
export function useUpdateSupply(id: string) {
  const invalidate = useInvalidateSupplies()
  return useMutation({ mutationFn: (payload: SupplyPatch) => api.updateSupply(id, payload), onSuccess: invalidate })
}
export function useDeleteSupply() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSupply,
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["summary"] })
      client.removeQueries({ queryKey: supplyKeys.detail(id) })
      return Promise.all([
        client.invalidateQueries({ queryKey: supplyKeys.lists() }),
        client.invalidateQueries({ queryKey: deliveryKeys.all }),
        client.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all }),
      ])
    },
  })
}
