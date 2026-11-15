import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { userStatusSchema } from "@/features/users/schemas"
import { setUserActive } from "@/features/users/service"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("users", "update")
    const input = userStatusSchema.parse(await request.json())
    return NextResponse.json(await setUserActive((await params).id, input.active, user.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
