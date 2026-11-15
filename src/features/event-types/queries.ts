"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import type { EventTypeInput } from "./schemas"
export const eventTypeKeys = { all: ["event-types"] as const }
export function useEventTypes() {
  return useQuery({ queryKey: eventTypeKeys.all, queryFn: api.listEventTypes })
}
export function useSaveEventType(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: EventTypeInput) => (id ? api.updateEventType(id, input) : api.createEventType(input)),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: eventTypeKeys.all }),
        client.invalidateQueries({ queryKey: ["summary"] }),
        client.invalidateQueries({ queryKey: ["events"] }),
        client.invalidateQueries({ queryKey: ["deliveries"] }),
      ])
    },
  })
}
export function useDeleteEventType() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEventType,
    onSuccess: () => client.invalidateQueries({ queryKey: eventTypeKeys.all }),
  })
}
