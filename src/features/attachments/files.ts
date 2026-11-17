import { fileTypeFromBuffer } from "file-type"
import { AppError } from "@/lib/api-error"
import { MAX_FILE_SIZE, type Kind } from "./schemas"
export async function inspectFile(file: File, kind: Kind) {
  if (!file.size || file.size > MAX_FILE_SIZE)
    throw new AppError(400, "Cada archivo debe contener datos y pesar como máximo 25 MB.")
  const body = new Uint8Array(await file.arrayBuffer())
  const detected = await fileTypeFromBuffer(body).catch(() => undefined)
  if (kind === "photo" && (!detected?.mime.startsWith("image/") || detected.mime === "image/svg+xml"))
    throw new AppError(400, "Las fotografías deben ser imágenes válidas (por ejemplo JPG, PNG o WebP).")
  if (kind === "alfa" && detected?.mime !== "application/pdf")
    throw new AppError(400, "El Informe ALFA debe ser un PDF válido.")
  const name =
    file.name
      .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
      .trim()
      .slice(0, 240) || "archivo"
  return { body, type: detected?.mime || "application/octet-stream", name, size: body.length }
}
/** Las rutas de control solo reciben JSON pequeño; el binario viaja directamente a R2. */
export async function readUploadMetadata(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) throw new AppError(400, "Faltan los datos del archivo.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 4096) {
        await reader.cancel()
        throw new AppError(413, "Los datos del archivo son demasiado grandes.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
  } catch {
    throw new AppError(400, "Los datos del archivo no son válidos.")
  }
}
