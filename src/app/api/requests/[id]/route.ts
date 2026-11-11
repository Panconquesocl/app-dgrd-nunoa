import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { deleteRequestQuerySchema, updateRequestSchema } from "@/features/requests/schemas"
import { deleteRequest, getRequest, updateRequest } from "@/features/requests/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("requests", "read")
    const { id } = await params
    return NextResponse.json(await getRequest(id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("requests", "update")
    const { id } = await params
    const input = updateRequestSchema.parse(await request.json())
    return NextResponse.json(await updateRequest(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("requests", "delete")
    const { id } = await params
    const { expectedDeliveryId } = deleteRequestQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    await deleteRequest(id, expectedDeliveryId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
