import type {
  AssociationHistoryQuery,
  ListNeighborhoodAssociationsQuery,
  NeighborhoodAssociationDetail,
  NeighborhoodAssociationListItem,
  NeighborhoodAssociationListResponse,
  NeighborhoodAssociationPayload,
  NeighborhoodAssociationPatch,
} from "./schemas"
const BASE_URL = "/api/neighborhood-associations"
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

export function listNeighborhoodAssociations(query: ListNeighborhoodAssociationsQuery = {}) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.status) params.set("status", query.status)
  return request<NeighborhoodAssociationListResponse>(`${BASE_URL}?${params}`)
}
export function getNeighborhoodAssociation(id: string, query: AssociationHistoryQuery = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  return request<NeighborhoodAssociationDetail>(`${BASE_URL}/${id}?${params}`)
}
export function createNeighborhoodAssociation(payload: NeighborhoodAssociationPayload) {
  return request<NeighborhoodAssociationListItem>(BASE_URL, { method: "POST", body: JSON.stringify(payload) })
}
export function updateNeighborhoodAssociation(id: string, payload: NeighborhoodAssociationPatch) {
  return request<NeighborhoodAssociationListItem>(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
export function deleteNeighborhoodAssociation(id: string) {
  return request<void>(`${BASE_URL}/${id}`, { method: "DELETE" })
}
