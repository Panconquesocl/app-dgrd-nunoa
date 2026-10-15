import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import {
  createNeighborhoodAssociationSchema,
  listNeighborhoodAssociationsQuerySchema,
} from "@/features/neighborhood-associations/schemas"
import {
  createNeighborhoodAssociation,
  listNeighborhoodAssociations,
} from "@/features/neighborhood-associations/service"
export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const query = listNeighborhoodAssociationsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listNeighborhoodAssociations(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const input = createNeighborhoodAssociationSchema.parse(await request.json())
    return NextResponse.json(await createNeighborhoodAssociation(input, user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
