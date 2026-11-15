import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getEventDeletionImpact } from "@/features/events/service"
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("events", "delete")
    return NextResponse.json(await getEventDeletionImpact((await params).id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
