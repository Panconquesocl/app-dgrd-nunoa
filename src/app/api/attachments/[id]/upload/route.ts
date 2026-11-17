import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { cancelUpload } from "@/features/attachments/service"
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await cancelUpload((await params).id, user)
    return new Response(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
