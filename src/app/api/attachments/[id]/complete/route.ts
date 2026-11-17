import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { completeUpload } from "@/features/attachments/service"
export const maxDuration = 300
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    return Response.json(await completeUpload((await params).id, user), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
