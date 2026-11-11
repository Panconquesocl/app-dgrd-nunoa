import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getDeliveryOptions } from "@/features/deliveries/service"
export async function GET() {
  try {
    await requirePermission("deliveries", "read")
    return NextResponse.json(await getDeliveryOptions())
  } catch (error) {
    return toErrorResponse(error)
  }
}
