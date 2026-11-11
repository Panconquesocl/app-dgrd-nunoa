import type {
  ListRequestsQuery,
  RequestDetail,
  RequestListItem,
  RequestListResponse,
  RequestOptions,
  RequestPatch,
  RequestPayload,
} from "./schemas"

const BASE_URL = "/api/requests"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[] | undefined>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.message ?? "No se pudo completar la operación.",
      body?.fieldErrors,
      body?.details,
    )
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export function listRequests(query: ListRequestsQuery = {}) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.event && query.event !== "all") params.set("event", query.event)
  if (query.status) params.set("status", query.status)
  return request<RequestListResponse>(`${BASE_URL}?${params}`)
}
export function getRequest(id: string) {
  return request<RequestDetail>(`${BASE_URL}/${id}`)
}
export function getRequestOptions() {
  return request<RequestOptions>(`${BASE_URL}/options`)
}
export function createRequest(payload: RequestPayload) {
  return request<RequestListItem>(BASE_URL, { method: "POST", body: JSON.stringify(payload) })
}
export function updateRequest(id: string, payload: RequestPatch) {
  return request<RequestListItem>(`${BASE_URL}/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}
/** `expectedDeliveryId`: la entrega que se mostró al confirmar (null = ninguna). */
export function deleteRequest({ id, expectedDeliveryId }: { id: string; expectedDeliveryId: string | null }) {
  const params = new URLSearchParams({ expectedDeliveryId: expectedDeliveryId ?? "" })
  return request<void>(`${BASE_URL}/${id}?${params}`, { method: "DELETE" })
}
