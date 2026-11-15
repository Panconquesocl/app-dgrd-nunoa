"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import type { CreateEventInput, DeletionImpact } from "./schemas"
export const eventKeys = { all: ["events"] as const, detail: (id: string) => ["events", "detail", id] as const }
export function useEvents() {
  return useQuery({ queryKey: ["events", "list"], queryFn: api.listEvents })
}
export function useEvent(id: string) {
  return useQuery({ queryKey: eventKeys.detail(id), queryFn: () => api.getEvent(id) })
}
export function useEventImpact(id: string) {
  return useQuery({ queryKey: ["events", "impact", id], queryFn: () => api.getDeletionImpact(id), staleTime: 0 })
}
function useInvalidateEvents() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      ["summary", "events", "requests", "deliveries", "event-types", "supplies", "neighborhood-associations"].map(
        (key) => client.invalidateQueries({ queryKey: [key] }),
      ),
    )
}
export function useSaveEvent(id?: string) {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: (input: CreateEventInput) => (id ? api.updateEvent(id, input) : api.createEvent(input)),
    onSuccess: invalidate,
  })
}
export function useDeleteEvent(id: string) {
  const invalidate = useInvalidateEvents()
  return useMutation({ mutationFn: (impact: DeletionImpact) => api.deleteEvent(id, impact), onSuccess: invalidate })
}
