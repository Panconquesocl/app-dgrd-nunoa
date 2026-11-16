"use client"
import { useQuery } from "@tanstack/react-query"
import type { SummaryData, NavigationCounts } from "./schemas"
export function useNavigationCounts(viewerKey: string) {
  return useQuery({
    queryKey: ["summary", "navigation", viewerKey],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/summary/counts", { signal })
      if (!response.ok) throw new Error("No se pudieron cargar los contadores.")
      return response.json() as Promise<NavigationCounts>
    },
  })
}
export function useSummary(year: number, viewerKey: string) {
  return useQuery({
    queryKey: ["summary", viewerKey, year],
    queryFn: async () => {
      const response = await fetch(`/api/summary?year=${year}`)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message ?? "No se pudo cargar el resumen.")
      }
      return response.json() as Promise<SummaryData>
    },
  })
}
