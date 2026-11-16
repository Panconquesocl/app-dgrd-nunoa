import { timingSafeEqual } from "node:crypto"
import { AppError, toErrorResponse } from "@/lib/api-error"
import { cleanup } from "@/features/attachments/service"
export async function POST(request: Request) {
  try {
    const secret = process.env.R2_CLEANUP_SECRET
    if (!secret) throw new AppError(503, "La limpieza no está configurada.")
    const provided = Buffer.from(request.headers.get("authorization") || "")
    const expected = Buffer.from(`Bearer ${secret}`)
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
      throw new AppError(401, "No autorizado.")
    return Response.json(await cleanup())
  } catch (error) {
    return toErrorResponse(error)
  }
}
