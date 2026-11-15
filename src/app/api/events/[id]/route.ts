import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { deletionSchema, eventSchema } from "@/features/events/schemas"
import { deleteEvent, getEvent, updateEvent } from "@/features/events/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  try {
    await requirePermission("events", "read")
    return NextResponse.json(await getEvent((await params).id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requirePermission("events", "update")
    return NextResponse.json(await updateEvent((await params).id, eventSchema.parse(await request.json())))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requirePermission("events", "delete")
    await deleteEvent((await params).id, deletionSchema.parse(await request.json()))
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
