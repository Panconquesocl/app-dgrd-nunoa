import type {
  ListSuppliesQuery,
  SupplyDetail,
  SupplyListItem,
  SupplyListResponse,
  SupplyPayload,
  SupplyPatch,
} from "./schemas"
const BASE_URL = "/api/supplies"
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

export function listSupplies(query: ListSuppliesQuery = {}) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  return request<SupplyListResponse>(`${BASE_URL}?${params}`)
}
export function getSupply(id: string, order: "asc" | "desc" = "desc") {
  return request<SupplyDetail>(`${BASE_URL}/${id}?order=${order}`)
}
export function createSupply(payload: SupplyPayload) {
  return request<SupplyListItem>(BASE_URL, { method: "POST", body: JSON.stringify(payload) })
}
export function updateSupply(id: string, payload: SupplyPatch) {
  return request<SupplyListItem>(`${BASE_URL}/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}
export function deleteSupply(id: string) {
  return request<void>(`${BASE_URL}/${id}`, { method: "DELETE" })
}
