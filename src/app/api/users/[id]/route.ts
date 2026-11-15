import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { userEditSchema } from "@/features/users/schemas"
import { deleteUser, updateUser } from "@/features/users/service"
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requirePermission("users", "update")
    return NextResponse.json(await updateUser((await params).id, userEditSchema.parse(await request.json()), user.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requirePermission("users", "delete")
    await deleteUser((await params).id, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
