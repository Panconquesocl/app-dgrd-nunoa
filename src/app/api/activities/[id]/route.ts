import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { activitySchema } from "@/features/activities/schemas"
import { deleteActivity, getActivity, updateActivity } from "@/features/activities/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  try {
    await requirePermission("activities", "read")
    return NextResponse.json(await getActivity((await params).id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const auditActor = await requirePermission("activities", "update")
    return NextResponse.json(
      await updateActivity((await params).id, activitySchema.parse(await request.json()), auditActor.id),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auditActor = await requirePermission("activities", "delete")
    await deleteActivity((await params).id, auditActor.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
