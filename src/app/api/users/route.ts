import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { userCreateSchema } from "@/features/users/schemas"
import { createUser, listUsers } from "@/features/users/service"
export async function GET() {
  try {
    const user = await requirePermission("users", "read")
    return NextResponse.json(await listUsers(user.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("users", "create")
    return NextResponse.json(await createUser(userCreateSchema.parse(await request.json()), user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
