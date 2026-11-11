import type {
  ListStrategicActionsQuery,
  StrategicActionDetail,
  StrategicActionListItem,
  StrategicActionListResponse,
  StrategicActionPatch,
  StrategicActionPayload,
} from "./schemas"

const BASE_URL = "/api/strategic-actions"

/**
 * Error de la API con el detalle que el servidor entrega: `fieldErrors` para
 * marcar campos en el formulario y `details` para casos como el conteo de
 * actividades que impiden eliminar una acción.
 */
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

function toSearchParams({ q, year }: ListStrategicActionsQuery) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (year !== undefined) params.set("year", String(year))

  const query = params.toString()
  return query ? `?${query}` : ""
}

export function listStrategicActions(query: ListStrategicActionsQuery) {
  return request<StrategicActionListResponse>(`${BASE_URL}${toSearchParams(query)}`)
}

export function getStrategicAction(id: string) {
  return request<StrategicActionDetail>(`${BASE_URL}/${id}`)
}

export function createStrategicAction(payload: StrategicActionPayload) {
  return request<StrategicActionListItem>(BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateStrategicAction(id: string, payload: StrategicActionPatch) {
  return request<StrategicActionListItem>(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteStrategicAction(id: string) {
  return request<void>(`${BASE_URL}/${id}`, { method: "DELETE" })
}
