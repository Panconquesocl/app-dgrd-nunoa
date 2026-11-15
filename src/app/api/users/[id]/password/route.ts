import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { userPasswordSchema } from "@/features/users/schemas"
import { resetUserPassword } from "@/features/users/service"
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("users", "update")
    const input = userPasswordSchema.parse(await request.json())
    await resetUserPassword((await params).id, input.password, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
