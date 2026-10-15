import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createDeliverySchema, listDeliveriesQuerySchema } from "@/features/deliveries/schemas"
import { createDelivery, listDeliveries } from "@/features/deliveries/service"
export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const query = listDeliveriesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listDeliveries(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const input = createDeliverySchema.parse(await request.json())
    return NextResponse.json(await createDelivery(input, user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
