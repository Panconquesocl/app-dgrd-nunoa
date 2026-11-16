import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { searchQuerySchema } from "@/features/search/schemas"
import { searchAll } from "@/features/search/service"

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("search", "read")
    const { q } = searchQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await searchAll(q, user.role), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
