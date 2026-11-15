"use client"
import { useQuery } from "@tanstack/react-query"
import type { SummaryData } from "./schemas"
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
