import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getNavigationCounts } from "@/features/summary/service"

export async function GET() {
  try {
    const user = await requirePermission("summary", "read")
    return NextResponse.json(await getNavigationCounts(user.role), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
