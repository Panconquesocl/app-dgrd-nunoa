import { z } from "zod"

export const neighborhoodAssociationFieldsSchema = z.object({
  number: z
    .number("El número no es válido.")
    .int("El número debe ser entero.")
    .positive("El número debe ser mayor a cero.")
    .max(2147483647, "El número es demasiado grande."),
  name: z
    .string("Indica el nombre de la junta.")
    .trim()
    .min(1, "Indica el nombre de la junta.")
    .max(200, "El nombre no puede superar los 200 caracteres."),
  active: z.boolean("El estado no es válido."),
})
export const createNeighborhoodAssociationSchema = neighborhoodAssociationFieldsSchema
export const updateNeighborhoodAssociationSchema = neighborhoodAssociationFieldsSchema.partial()
export const listNeighborhoodAssociationsQuerySchema = z.object({
  q: z.string().trim().max(500, "La búsqueda es demasiado larga.").optional(),
  status: z.enum(["all", "active", "inactive"], "El estado no es válido.").default("all"),
})
export const associationHistoryQuerySchema = z.object({
  order: z.enum(["asc", "desc"], "El orden no es válido.").default("desc"),
})
export const neighborhoodAssociationFormSchema = neighborhoodAssociationFieldsSchema.extend({
  number: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Indica un número entero mayor a cero.")
    .refine((value) => Number(value) <= 2147483647, "El número es demasiado grande."),
})
export type NeighborhoodAssociationPayload = z.infer<typeof createNeighborhoodAssociationSchema>
export type NeighborhoodAssociationPatch = Partial<NeighborhoodAssociationPayload>
export type NeighborhoodAssociationFormValues = z.infer<typeof neighborhoodAssociationFormSchema>
export type ListNeighborhoodAssociationsQuery = { q?: string; status?: "all" | "active" | "inactive" }
export type NeighborhoodAssociationListItem = {
  id: string
  number: number
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  _count: { deliveries: number }
}
export type NeighborhoodAssociationListResponse = { data: NeighborhoodAssociationListItem[] }
export type NeighborhoodAssociationDetail = NeighborhoodAssociationListItem & {
  totalUnits: number
  deliveries: { id: string; folio: string; beneficiary: string; date: string; items: { quantity: number }[] }[]
}
export function toNeighborhoodAssociationPayload(
  values: NeighborhoodAssociationFormValues,
): NeighborhoodAssociationPayload {
  return { ...values, number: Number(values.number) }
}
