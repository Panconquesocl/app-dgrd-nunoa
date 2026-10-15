import { z } from "zod"

export const listSuppliesQuerySchema = z.object({
  q: z.string().trim().max(500, "La búsqueda es demasiado larga.").optional(),
})
export const supplyHistoryQuerySchema = z.object({
  order: z.enum(["asc", "desc"], "El orden no es válido.").default("desc"),
})
export type ListSuppliesQuery = { q?: string }
export type SupplyListItem = {
  id: string
  type: string
  unit: string
  createdAt: string
  updatedAt: string
  _count: { items: number }
}
export type SupplyListResponse = { data: SupplyListItem[] }
export type SupplyDetail = SupplyListItem & {
  creator: { id: string; name: string }
  totalDistributed: number
  items: {
    quantity: number
    delivery: {
      id: string
      folio: string
      date: string
      beneficiary: string
      event: { id: string; folio: string } | null
    }
  }[]
}

export const SUPPLY_UNITS = ["unidad", "par", "rollo", "corte", "kg", "litro", "caja"] as const
export const supplyFieldsSchema = z.object({
  type: z
    .string("Indica el nombre del insumo.")
    .trim()
    .min(1, "Indica el nombre del insumo.")
    .max(200, "El nombre no puede superar los 200 caracteres."),
  unit: z.enum(SUPPLY_UNITS, "Selecciona una unidad de medida válida."),
})
export const createSupplySchema = supplyFieldsSchema
export const updateSupplySchema = supplyFieldsSchema.partial()
export const supplyFormSchema = supplyFieldsSchema
export type SupplyPayload = z.infer<typeof createSupplySchema>
export type SupplyPatch = z.infer<typeof updateSupplySchema>
export type SupplyFormValues = z.infer<typeof supplyFormSchema>
