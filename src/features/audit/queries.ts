"use client"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import * as api from "./api"
import type { AuditQuery } from "./schemas"
export function useAudit(query: AuditQuery, viewerKey: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["audit", viewerKey, query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => api.listAudit({ ...query, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}
export function useAuditActors(viewerKey: string) {
  return useQuery({
    queryKey: ["audit-actors", viewerKey],
    queryFn: ({ signal }) => api.getAuditActors(signal),
    staleTime: 0,
    gcTime: 0,
  })
}
