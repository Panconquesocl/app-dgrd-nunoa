"use client"
import { useQuery } from "@tanstack/react-query"
import { searchAll } from "./api"

export function useGlobalSearch(q: string, viewerKey: string, restrictedAccess: string, enabled: boolean) {
  return useQuery({
    queryKey: ["global-search", viewerKey, restrictedAccess, q],
    queryFn: ({ signal }) => searchAll(q, signal),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}
