import { z } from "zod"
import type { Resource } from "@/lib/permissions"

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Escribe al menos dos caracteres.")
    .max(200, "La búsqueda no puede superar los 200 caracteres."),
})
export type SearchResult = { id: string; title: string; description: string; href: string }
export type SearchGroup = { key: Resource; label: string; href: string; results: SearchResult[]; hasMore: boolean }
export type SearchResponse = { query: string; groups: SearchGroup[] }
export const SEARCH_GROUP_LIMIT = 5
