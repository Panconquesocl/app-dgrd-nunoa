import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import {
  associationHistoryQuerySchema,
  updateNeighborhoodAssociationSchema,
} from "@/features/neighborhood-associations/schemas"
import {
  getNeighborhoodAssociation,
  updateNeighborhoodAssociation,
  deleteNeighborhoodAssociation,
} from "@/features/neighborhood-associations/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("neighborhood-associations", "read")
    const { id } = await params
    const { order } = associationHistoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await getNeighborhoodAssociation(id, order))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("neighborhood-associations", "update")
    const { id } = await params
    const input = updateNeighborhoodAssociationSchema.parse(await request.json())
    return NextResponse.json(await updateNeighborhoodAssociation(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("neighborhood-associations", "delete")
    const { id } = await params
    await deleteNeighborhoodAssociation(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
