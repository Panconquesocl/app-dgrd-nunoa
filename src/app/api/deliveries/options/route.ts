import { NextResponse } from "next/server"
import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { getDeliveryOptions } from "@/features/deliveries/service"
export async function GET() {
  try {
    await requireUser()
    return NextResponse.json(await getDeliveryOptions())
  } catch (error) {
    return toErrorResponse(error)
  }
}
