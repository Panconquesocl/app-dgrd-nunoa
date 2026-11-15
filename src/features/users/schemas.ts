import { z } from "zod"
export const PASSWORD_MIN = 12
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
  .max(128, "La contraseña no puede superar los 128 caracteres.")
const name = z.string().trim().min(1, "Indica el nombre.").max(100, "El nombre no puede superar los 100 caracteres.")
const lastName = z
  .string()
  .trim()
  .min(1, "Indica el apellido.")
  .max(150, "El apellido no puede superar los 150 caracteres.")
const role = z.enum(["admin", "regular"], "Selecciona un rol válido.")
export const userEditSchema = z.object({ name, lastName, role }).strict()
export const userCreateSchema = userEditSchema
  .extend({
    email: z.string().trim().toLowerCase().email("Indica un correo válido.").max(254, "El correo es demasiado largo."),
    password: passwordSchema,
  })
  .strict()
export const userStatusSchema = z.object({ active: z.boolean() }).strict()
export const userPasswordSchema = z.object({ password: passwordSchema }).strict()
export type UserEditInput = z.infer<typeof userEditSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserItem = {
  id: string
  name: string
  lastName: string | null
  email: string
  role: "admin" | "regular" | "unknown"
  active: boolean
  createdAt: string
  recordCount: number
}
