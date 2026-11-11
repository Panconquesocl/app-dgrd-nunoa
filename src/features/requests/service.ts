import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { deliveryFolioYear } from "@/features/deliveries/folio"
import { nextRequestFolio } from "./folio"
import type { CreateRequestInput, ListRequestsQuery, UpdateRequestInput } from "./schemas"

const eventSelect = { select: { id: true, folio: true, sector: true } } as const

const listSelect = {
  id: true,
  folio: true,
  channel: true,
  response: true,
  status: true,
  eventId: true,
  event: eventSelect,
  delivery: { select: { id: true, folio: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RequestSelect

export async function listRequests({ q, event = "all", status }: ListRequestsQuery = {}) {
  const where: Prisma.RequestWhereInput = {
    ...(event === "with" && { eventId: { not: null } }),
    ...(event === "without" && { eventId: null }),
    ...(status && { status }),
    ...(q && {
      OR: [
        { folio: { contains: q, mode: "insensitive" } },
        { channel: { contains: q, mode: "insensitive" } },
        { response: { contains: q, mode: "insensitive" } },
      ],
    }),
  }
  const data = await prisma.request.findMany({
    where,
    select: listSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  return { data }
}

export async function getRequest(id: string) {
  const request = await prisma.request.findUnique({
    where: { id },
    select: {
      ...listSelect,
      creator: { select: { id: true, name: true } },
      delivery: { select: { id: true, folio: true, date: true, beneficiary: true } },
    },
  })
  if (!request) throw new AppError(404, "La solicitud no existe.")
  return request
}

/** Eventos disponibles para asociar a una solicitud. */
export async function getRequestOptions() {
  const events = await prisma.event.findMany({
    select: { id: true, folio: true, sector: true, date: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  })
  return { events }
}

function missingEvent(): never {
  throw new AppError(409, "El evento seleccionado ya no existe.", {
    fieldErrors: { eventId: ["El evento seleccionado ya no existe."] },
  })
}

/** FOR SHARE impide que el evento se borre entre la validación y el commit. */
async function assertEvent(tx: Prisma.TransactionClient, eventId: string | null | undefined) {
  if (!eventId) return
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "event" WHERE id = ${eventId} FOR SHARE`
  if (!rows.length) missingEvent()
}

function translateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "La solicitud no existe.")
    if (error.code === "P2003") missingEvent()
    if (error.code === "P2002") throw new AppError(409, "No se pudo asignar un folio único. Inténtalo nuevamente.")
  }
  throw error
}

export async function createRequest(input: CreateRequestInput, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const year = deliveryFolioYear()
      // Serializa las altas del año para que dos solicitudes no reserven el mismo correlativo.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(684104, ${year}::integer)::text`
      await assertEvent(tx, input.eventId)
      const folios = await tx.request.findMany({
        where: { folio: { startsWith: `SOL-${year}-` } },
        select: { folio: true },
      })
      return tx.request.create({
        data: {
          ...input,
          createdBy: userId,
          folio: nextRequestFolio(
            folios.map((row) => row.folio),
            year,
          ),
        },
        select: listSelect,
      })
    })
  } catch (error) {
    translateError(error)
  }
}

export async function updateRequest(id: string, input: UpdateRequestInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Mismo bloqueo que toma una entrega al vincularse: la sincronización del
      // evento no compite con un alta o cambio de entrega concurrente.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "request" WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new AppError(404, "La solicitud no existe.")
      await assertEvent(tx, input.eventId)
      const updated = await tx.request.update({ where: { id }, data: input, select: listSelect })
      if (input.eventId !== undefined) {
        // B04: la entrega vinculada hereda el evento de su solicitud.
        await tx.delivery.updateMany({ where: { requestId: id }, data: { eventId: input.eventId } })
      }
      return updated
    })
  } catch (error) {
    translateError(error)
  }
}

/**
 * Borrar una solicitud elimina su entrega en cascada (B11). `expectedDeliveryId`
 * es la entrega que el usuario vio al confirmar ("" = ninguna); si cambió desde
 * entonces, se rechaza para no borrar una entrega que no se le mostró.
 */
export async function deleteRequest(id: string, expectedDeliveryId?: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "request" WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new AppError(404, "La solicitud no existe.")
      const delivery = await tx.delivery.findUnique({ where: { requestId: id }, select: { id: true, folio: true } })
      if (expectedDeliveryId !== undefined && (delivery?.id ?? "") !== expectedDeliveryId) {
        throw new AppError(
          409,
          delivery
            ? `La solicitud ahora tiene la entrega ${delivery.folio} vinculada. Revisa antes de eliminar.`
            : "La entrega vinculada cambió. Revisa antes de eliminar.",
          { details: { delivery } },
        )
      }
      await tx.request.delete({ where: { id } })
    })
  } catch (error) {
    translateError(error)
  }
}
