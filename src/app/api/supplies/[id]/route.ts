import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { supplyHistoryQuerySchema, updateSupplySchema } from "@/features/supplies/schemas"
import { getSupply, updateSupply, deleteSupply } from "@/features/supplies/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("supplies", "read")
    const { id } = await params
    const { order } = supplyHistoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await getSupply(id, order))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const auditActor = await requirePermission("supplies", "update")
    const { id } = await params
    const input = updateSupplySchema.parse(await request.json())
    return NextResponse.json(await updateSupply(id, input, auditActor.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const auditActor = await requirePermission("supplies", "delete")
    const { id } = await params
    await deleteSupply(id, auditActor.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
