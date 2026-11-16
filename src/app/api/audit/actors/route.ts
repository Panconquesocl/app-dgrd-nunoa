import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getAuditActors } from "@/features/audit/service"
export async function GET() {
  try {
    await requirePermission("audit", "read")
    return NextResponse.json(await getAuditActors(), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
