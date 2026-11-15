import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getSchedule } from "@/features/activities/service"
export async function GET() {
  try {
    await requirePermission("activities", "read")
    return NextResponse.json(await getSchedule())
  } catch (error) {
    return toErrorResponse(error)
  }
}
