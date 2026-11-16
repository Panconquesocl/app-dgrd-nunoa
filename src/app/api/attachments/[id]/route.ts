import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { deleteAttachment } from "@/features/attachments/service"
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await deleteAttachment((await params).id, user)
    return new Response(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
