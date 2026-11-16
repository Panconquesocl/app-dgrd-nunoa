import { z } from "zod"
export const MAX_FILE_SIZE = 25 * 1024 * 1024
export const MAX_GROUP_FILES = 20
export const ownerSchema = z.object({
  resource: z.enum(["deliveries", "events", "activities"]),
  recordId: z.string().min(1).max(128),
})
export const uploadSchema = ownerSchema.extend({ kind: z.enum(["photo", "file", "alfa", "evidence"]) })
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
