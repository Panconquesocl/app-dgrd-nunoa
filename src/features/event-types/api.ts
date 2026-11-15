import type { EventTypeInput, EventTypeItem, EventTypesResponse } from "./schemas"
export class EventTypeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/event-types${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new EventTypeApiError(
      response.status,
      body?.message ?? "No se pudo completar la operación.",
      body?.fieldErrors,
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
export const listEventTypes = () => request<EventTypesResponse>()
export const createEventType = (input: EventTypeInput) =>
  request<EventTypeItem>("", { method: "POST", body: JSON.stringify(input) })
export const updateEventType = (id: string, input: EventTypeInput) =>
  request<EventTypeItem>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })
export const deleteEventType = (id: string) => request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" })
