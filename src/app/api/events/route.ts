import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createEventSchema } from "@/features/events/schemas"
import { createEvent, listEvents } from "@/features/events/service"
export async function GET() {
  try {
    await requirePermission("events", "read")
    return NextResponse.json(await listEvents())
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("events", "create")
    return NextResponse.json(await createEvent(createEventSchema.parse(await request.json()), user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
