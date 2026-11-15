import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { activitySchema } from "@/features/activities/schemas"
import { createActivity } from "@/features/activities/service"
export async function POST(request: Request) {
  try {
    const user = await requirePermission("activities", "create")
    return NextResponse.json(await createActivity(activitySchema.parse(await request.json()), user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
