import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createSupplySchema, listSuppliesQuerySchema } from "@/features/supplies/schemas"
import { createSupply, listSupplies } from "@/features/supplies/service"
export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const query = listSuppliesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listSupplies(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const input = createSupplySchema.parse(await request.json())
    return NextResponse.json(await createSupply(input, user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
