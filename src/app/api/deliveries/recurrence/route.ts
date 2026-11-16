import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { deliveryRecurrenceQuerySchema } from "@/features/deliveries/schemas"
import { getDeliveryRecurrence } from "@/features/deliveries/service"

export async function GET(request: NextRequest) {
  try {
    await requirePermission("deliveries", "create")
    const { rut } = deliveryRecurrenceQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await getDeliveryRecurrence(rut), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
