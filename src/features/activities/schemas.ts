import { z } from "zod"
const text = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `El texto no puede superar los ${max} caracteres.`)
export const activityFormSchema = z.object({
  actionId: z.cuid("Selecciona una acción válida."),
  date: z.iso.date("Indica una fecha válida."),
  location: text("Indica la dirección.", 500),
  objective: text("Describe el objetivo.", 4000),
  participants: z.string().trim().max(2000, "El texto no puede superar los 2000 caracteres."),
})
export const activitySchema = activityFormSchema.extend({
  participants: activityFormSchema.shape.participants.default(""),
})
export type ActivityInput = z.infer<typeof activitySchema>
export type ActivityAction = {
  id: string
  number: number
  year: number
  title: string
  startDate: string
  endDate: string
}
export type ActivityItem = ActivityInput & {
  id: string
  createdAt: string
  action: ActivityAction
  creator: { name: string }
}
export type ScheduleData = { actions: ActivityAction[]; activities: ActivityItem[] }
