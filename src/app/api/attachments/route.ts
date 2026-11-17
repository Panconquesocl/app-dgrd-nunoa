import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { ownerSchema, uploadSchema, uploadMetadataSchema } from "@/features/attachments/schemas"
import { assertOwner, listAttachments, beginUpload } from "@/features/attachments/service"
import { readUploadMetadata } from "@/features/attachments/files"
export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const owner = ownerSchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    return Response.json(await listAttachments(owner, user), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = uploadSchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    await assertOwner(input, user, true)
    return Response.json(
      await beginUpload(input, input.kind, uploadMetadataSchema.parse(await readUploadMetadata(request)), user),
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
