import type { SearchResponse } from "./schemas"

export async function searchAll(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(`/api/search?${new URLSearchParams({ q })}`, { signal, cache: "no-store" })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? "No se pudo realizar la búsqueda.")
  }
  return response.json()
}
