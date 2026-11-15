import type { CreateEventInput, DeletionImpact, EventDetail, EventInput, EventItem } from "./schemas"
export class EventApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/events${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new EventApiError(response.status, body?.message ?? "No se pudo completar la operación.", body?.fieldErrors)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
export const listEvents = () => request<{ data: EventItem[] }>()
export const getEvent = (id: string) => request<EventDetail>(`/${encodeURIComponent(id)}`)
export const createEvent = (input: CreateEventInput) =>
  request<EventItem>("", { method: "POST", body: JSON.stringify(input) })
export const updateEvent = (id: string, input: EventInput) =>
  request<EventItem>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })
export const getDeletionImpact = (id: string) => request<DeletionImpact>(`/${encodeURIComponent(id)}/deletion-impact`)
export const deleteEvent = (id: string, impact: DeletionImpact) =>
  request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify(impact) })
