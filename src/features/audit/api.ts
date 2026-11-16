import type { AuditQuery, AuditResponse, AuditActor } from "./schemas"
async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? "No se pudo consultar la auditoría.")
  }
  return response.json()
}
export const listAudit = (query: AuditQuery, signal?: AbortSignal) =>
  get<AuditResponse>(
    `/api/audit?${new URLSearchParams(Object.entries(query).filter(([, value]) => Boolean(value)) as [string, string][])}`,
    signal,
  )
export const getAuditActors = (signal?: AbortSignal) => get<AuditActor[]>("/api/audit/actors", signal)
