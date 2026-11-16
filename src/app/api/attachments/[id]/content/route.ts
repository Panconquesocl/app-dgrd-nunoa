import { requireUser } from "@/lib/session"
import { AppError, toErrorResponse } from "@/lib/api-error"
import { findAttachment } from "@/features/attachments/service"
import { getObject } from "@/features/attachments/storage"
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const row = await findAttachment((await params).id, await requireUser())
    const object = await getObject(row.bucket!, row.key)
    if (!object.Body) throw new AppError(404, "No se encontró el archivo almacenado.")
    const inline = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "application/pdf"].includes(
      row.type,
    )
    const disposition = new URL(request.url).searchParams.has("download") || !inline ? "attachment" : "inline"
    return new Response(object.Body.transformToWebStream() as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": row.type,
        "Content-Length": String(object.ContentLength ?? row.size),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(row.name).replace(/'/g, "%27")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
