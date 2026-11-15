"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import type { ActivityInput } from "./schemas"
export function useSchedule() {
  return useQuery({ queryKey: ["activities", "schedule"], queryFn: api.getSchedule })
}
export function useActivity(id: string) {
  return useQuery({ queryKey: ["activities", "detail", id], queryFn: () => api.getActivity(id) })
}
function useInvalidate() {
  const client = useQueryClient()
  return () =>
    Promise.all(["activities", "strategic-actions"].map((key) => client.invalidateQueries({ queryKey: [key] })))
}
export function useSaveActivity(id?: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: ActivityInput) => api.saveActivity(input, id), onSuccess: invalidate })
}
export function useDeleteActivity(id: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: () => api.deleteActivity(id), onSuccess: invalidate })
}
