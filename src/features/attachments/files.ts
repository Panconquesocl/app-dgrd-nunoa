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
/** Acota el cuerpo incluso si Content-Length falta o es falso. */
export async function readUpload(request: Request) {
  const limit = MAX_FILE_SIZE + 64 * 1024
  if (Number(request.headers.get("content-length")) > limit) throw new AppError(413, "El archivo supera los 25 MB.")
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new AppError(400, "La carga debe usar multipart/form-data.")
  const reader = request.body?.getReader()
  if (!reader) throw new AppError(400, "Falta el archivo.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel()
        throw new AppError(413, "El archivo supera los 25 MB.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const data = await new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": request.headers.get("content-type")! },
  })
    .formData()
    .catch(() => {
      throw new AppError(400, "El formulario de archivos no es válido.")
    })
  const files = data.getAll("file")
  if (files.length !== 1 || !(files[0] instanceof File) || [...data.keys()].some((key) => key !== "file"))
    throw new AppError(400, "Carga un archivo a la vez.")
  return files[0]
}
