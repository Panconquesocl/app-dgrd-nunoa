import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventTypeSchema } from "@/features/event-types/schemas"
import { createEventType, listEventTypes } from "@/features/event-types/service"
export async function GET() {
  try {
    await requirePermission("event-types", "read")
    return NextResponse.json(await listEventTypes())
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("event-types", "create")
    const input = eventTypeSchema.parse(await request.json())
    return NextResponse.json(await createEventType(input, user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
