import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getRequestOptions } from "@/features/requests/service"
export async function GET() {
  try {
    await requirePermission("requests", "read")
    return NextResponse.json(await getRequestOptions())
  } catch (error) {
    return toErrorResponse(error)
  }
}
