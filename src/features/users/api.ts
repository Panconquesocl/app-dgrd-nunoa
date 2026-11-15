import type { UserCreateInput, UserEditInput, UserItem } from "./schemas"
export class UserApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/users${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new UserApiError(response.status, body?.message ?? "No se pudo completar la operación.", body?.fieldErrors)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
const path = (id: string) => `/${encodeURIComponent(id)}`
export const listUsers = () => request<{ data: UserItem[] }>()
export const createUser = (input: UserCreateInput) =>
  request<UserItem>("", { method: "POST", body: JSON.stringify(input) })
export const updateUser = (id: string, input: UserEditInput) =>
  request<UserItem>(path(id), { method: "PATCH", body: JSON.stringify(input) })
export const setUserActive = (id: string, active: boolean) =>
  request<UserItem>(`${path(id)}/status`, { method: "PATCH", body: JSON.stringify({ active }) })
export const resetUserPassword = (id: string, password: string) =>
  request<void>(`${path(id)}/password`, { method: "POST", body: JSON.stringify({ password }) })
export const deleteUser = (id: string) => request<void>(path(id), { method: "DELETE" })
