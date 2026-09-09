import { NextResponse, type NextRequest } from "next/server"
import { toErrorResponse } from "@/lib/api-error"
import { requireUser } from "@/lib/session"
import { updateStrategicActionSchema } from "@/features/strategic-actions/schemas"
import { deleteStrategicAction, getStrategicAction, updateStrategicAction } from "@/features/strategic-actions/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireUser()
    const { id } = await params

    return NextResponse.json(await getStrategicAction(id))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    await requireUser()
    const { id } = await params
    const input = updateStrategicActionSchema.parse(await request.json())

    return NextResponse.json(await updateStrategicAction(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireUser()
    const { id } = await params
    await deleteStrategicAction(id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
