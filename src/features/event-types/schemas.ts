import { z } from "zod"
export const eventTypeSchema = z.object({
  name: z
    .string("Indica el nombre.")
    .trim()
    .min(1, "Indica el nombre.")
    .max(200, "El nombre no puede superar los 200 caracteres."),
})
export type EventTypeInput = z.infer<typeof eventTypeSchema>
export type EventTypeItem = { id: string; name: string; _count: { events: number } }
export type EventTypesResponse = { data: EventTypeItem[] }
