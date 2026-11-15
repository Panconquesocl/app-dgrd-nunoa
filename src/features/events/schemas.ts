import { z } from "zod"
const fields = {
  typeId: z.cuid("Selecciona un tipo de evento válido."),
  date: z.iso.date("Indica una fecha válida."),
  sector: z.string().trim().min(1, "Indica el sector.").max(500, "El sector no puede superar los 500 caracteres."),
  affectedCount: z
    .number()
    .int("Indica una cantidad entera.")
    .min(0, "La cantidad no puede ser negativa.")
    .max(2147483647, "La cantidad es demasiado grande.")
    .nullable(),
  institutions: z.string().trim().max(2000, "El texto no puede superar los 2000 caracteres."),
  actions: z.string().trim().max(4000, "El texto no puede superar los 4000 caracteres."),
}
export const eventSchema = z.object({
  ...fields,
  affectedCount: fields.affectedCount.default(null),
  institutions: fields.institutions.default(""),
  actions: fields.actions.default(""),
})
export const createEventSchema = eventSchema.extend({ requestId: z.cuid("La solicitud no es válida.").optional() })
export const eventFormSchema = z.object({
  ...fields,
  affectedCount: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 2147483647),
      "Indica un entero no negativo válido.",
    ),
})
export const deletionSchema = z.object({
  requestIds: z.array(z.string()).max(100000),
  deliveryIds: z.array(z.string()).max(100000),
})
export type EventInput = z.infer<typeof eventSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type EventFormValues = z.infer<typeof eventFormSchema>
export type DeletionInput = z.infer<typeof deletionSchema>
export type EventItem = {
  id: string
  folio: string
  typeId: string
  type: { id: string; name: string }
  date: string
  sector: string
  affectedCount: number | null
  institutions: string
  actions: string
  createdAt: string
  _count: { requests: number; deliveries: number }
}
export type EventDetail = EventItem & {
  creator: { name: string }
  requests: { id: string; folio: string; channel: string; status: "pending" | "attended" | "cancelled" }[]
  deliveries: { id: string; folio: string; date: string; beneficiary: string }[]
}
export type DeletionImpact = { requestIds: string[]; deliveryIds: string[] }
