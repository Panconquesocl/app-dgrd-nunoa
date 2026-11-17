import { z } from "zod"
export const MAX_FILE_SIZE = 25 * 1024 * 1024
export const MAX_GROUP_FILES = 20
export const ownerSchema = z.object({
  resource: z.enum(["deliveries", "events", "activities"]),
  recordId: z.string().min(1).max(128),
})
export const uploadSchema = ownerSchema.extend({ kind: z.enum(["photo", "file", "alfa", "evidence"]) })
export const uploadMetadataSchema = z.object({
  name: z
    .string()
    .min(1, "Indica el nombre del archivo.")
    .max(240, "El nombre del archivo no puede superar los 240 caracteres."),
  size: z.number().int().min(1, "El archivo debe contener datos.").max(MAX_FILE_SIZE, "El archivo supera los 25 MB."),
})
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>
export type UploadTicket = { id: string; uploadUrl: string; headers: Record<string, string>; expiresAt: string }
export const confirmationSchema = z.object({ attachmentIds: z.array(z.string().max(128)).max(100).default([]) })
export type Owner = z.infer<typeof ownerSchema>
export type Kind = z.infer<typeof uploadSchema>["kind"]
export type Attachment = {
  id: string
  name: string
  type: string
  size: number
  kind: Kind
  status: "pending" | "ready"
  available: boolean
  createdAt: string
}
export const groupLabels: Record<Kind, string> = {
  photo: "Fotografías",
  file: "Archivos",
  alfa: "Informe ALFA",
  evidence: "Evidencia",
}
