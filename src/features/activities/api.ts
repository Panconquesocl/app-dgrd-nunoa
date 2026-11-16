import type { ActivityInput, ActivityItem, ScheduleData } from "./schemas"
export class ActivityApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/activities${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ActivityApiError(
      response.status,
      body?.message ?? "No se pudo completar la operación.",
      body?.fieldErrors,
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
export const getSchedule = () => request<ScheduleData>("/schedule")
export const getActivity = (id: string) => request<ActivityItem>(`/${encodeURIComponent(id)}`)
export const saveActivity = (input: ActivityInput, id?: string) =>
  request<ActivityItem>(id ? `/${encodeURIComponent(id)}` : "", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(input),
  })
export const deleteActivity = (id: string, attachmentIds: string[]) =>
  request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ attachmentIds }) })
