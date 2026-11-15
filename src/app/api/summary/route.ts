import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { currentSummaryYear, summaryYearSchema } from "@/features/summary/schemas"
import { getSummary } from "@/features/summary/service"
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("summary", "read")
    const year = summaryYearSchema.parse(request.nextUrl.searchParams.get("year") ?? currentSummaryYear())
    return NextResponse.json(await getSummary(year, user.role))
  } catch (error) {
    return toErrorResponse(error)
  }
}
