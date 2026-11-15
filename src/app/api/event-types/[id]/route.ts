import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventTypeSchema } from "@/features/event-types/schemas"
import { deleteEventType, updateEventType } from "@/features/event-types/service"
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requirePermission("event-types", "update")
    const { id } = await params
    const input = eventTypeSchema.parse(await request.json())
    return NextResponse.json(await updateEventType(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    await requirePermission("event-types", "delete")
    const { id } = await params
    await deleteEventType(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
