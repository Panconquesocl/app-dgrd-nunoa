import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { deliveryFolioYear } from "@/features/deliveries/folio"
import type { CreateEventInput, DeletionInput, EventInput } from "./schemas"
const select = {
  id: true,
  folio: true,
  typeId: true,
  type: { select: { id: true, name: true } },
  date: true,
  sector: true,
  affectedCount: true,
  institutions: true,
  actions: true,
  createdAt: true,
  _count: { select: { requests: true, deliveries: true } },
} satisfies Prisma.EventSelect
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "El evento no existe.")
    if (error.code === "P2002") throw new AppError(409, "El folio ya está ocupado. Actualiza y vuelve a intentar.")
    if (error.code === "P2003")
      throw new AppError(409, "El tipo de evento o la solicitud cambió. Actualiza el formulario.")
  }
  throw error
}
async function assertType(tx: Prisma.TransactionClient, typeId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event_type WHERE id = ${typeId} FOR SHARE`
  if (!rows.length)
    throw new AppError(409, "El tipo seleccionado ya no existe.", {
      fieldErrors: { typeId: ["Selecciona otro tipo de evento."] },
    })
}
export async function listEvents() {
  return { data: await prisma.event.findMany({ select, orderBy: [{ date: "desc" }, { id: "desc" }] }) }
}
export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      ...select,
      creator: { select: { name: true } },
      requests: {
        select: { id: true, folio: true, channel: true, status: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      deliveries: {
        select: { id: true, folio: true, date: true, beneficiary: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
      },
    },
  })
  if (!event) throw new AppError(404, "El evento no existe.")
  return event
}
export async function createEvent(input: CreateEventInput, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const { requestId, ...fields } = input
      // Mismo orden que editar solicitudes: primero solicitud, después evento/tipo.
      if (requestId) {
        const rows = await tx.$queryRaw<
          { id: string; eventId: string | null }[]
        >`SELECT id, "eventId" FROM "request" WHERE id = ${requestId} FOR UPDATE`
        if (!rows.length) throw new AppError(409, "La solicitud ya no existe.")
        if (rows[0].eventId) throw new AppError(409, "La solicitud ya tiene un evento asociado. Revisa sus datos.")
      }
      await assertType(tx, fields.typeId)
      const year = deliveryFolioYear()
      const counter = await tx.eventFolioCounter.upsert({
        where: { year },
        create: { year, lastValue: BigInt(1) },
        update: { lastValue: { increment: BigInt(1) } },
      })
      const event = await tx.event.create({
        data: {
          ...fields,
          date: new Date(`${fields.date}T00:00:00.000Z`),
          createdBy: userId,
          folio: `EV-${year}-${String(counter.lastValue).padStart(3, "0")}`,
        },
        select,
      })
      if (requestId) {
        await tx.request.update({ where: { id: requestId }, data: { eventId: event.id } })
        await tx.delivery.updateMany({ where: { requestId }, data: { eventId: event.id } })
      }
      return event
    })
  } catch (error) {
    translate(error)
  }
}
export async function updateEvent(id: string, input: EventInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertType(tx, input.typeId)
      return tx.event.update({
        where: { id },
        data: { ...input, date: new Date(`${input.date}T00:00:00.000Z`) },
        select,
      })
    })
  } catch (error) {
    translate(error)
  }
}
const impactSelect = { requests: { select: { id: true } }, deliveries: { select: { id: true } } } as const
function impact(event: { requests: { id: string }[]; deliveries: { id: string }[] }) {
  return {
    requestIds: event.requests.map((row) => row.id).sort(),
    deliveryIds: event.deliveries.map((row) => row.id).sort(),
  }
}
export async function getEventDeletionImpact(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: impactSelect })
  if (!event) throw new AppError(404, "El evento no existe.")
  return impact(event)
}
export async function deleteEvent(id: string, expected: DeletionInput) {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "event" WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new AppError(404, "El evento no existe.")
      const event = await tx.event.findUniqueOrThrow({ where: { id }, select: impactSelect })
      const current = impact(event)
      if (
        JSON.stringify(current.requestIds) !== JSON.stringify([...expected.requestIds].sort()) ||
        JSON.stringify(current.deliveryIds) !== JSON.stringify([...expected.deliveryIds].sort())
      )
        throw new AppError(
          409,
          "Las asociaciones del evento cambiaron. Revisa la advertencia antes de confirmar nuevamente.",
          { details: current },
        )
      // SetNull conserva solicitudes, entregas e ítems. La fila bloqueada impide nuevos vínculos durante el borrado.
      await tx.event.delete({ where: { id } })
    })
  } catch (error) {
    translate(error)
  }
}
