import { confirmAttachments, processDeletions } from "@/features/attachments/service"
import { auditedTransaction } from "@/features/audit/transaction"
import { nextDeliveryFolio, deliveryFolioYear } from "./folio"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { deliveryRecurrenceWindow } from "./recurrence"
import { rutSearchFragments } from "./search"
import {
  beneficiaryRutSchema,
  type CreateDeliveryInput,
  type UpdateDeliveryInput,
  type ListDeliveriesQuery,
} from "./schemas"

const include = {
  neighborhoodAssociation: { select: { id: true, number: true, name: true, active: true } },
  creator: { select: { id: true, name: true } },
  request: { select: { id: true, folio: true, channel: true } },
  event: { select: { id: true, folio: true, address: true, type: { select: { name: true } } } },
  items: { include: { supply: { select: { id: true, type: true, unit: true } } } },
} satisfies Prisma.DeliveryInclude

export async function listDeliveries(query: ListDeliveriesQuery) {
  const {
    q,
    beneficiary,
    beneficiaryRut,
    eventId,
    from,
    to,
    event,
    supplyId,
    neighborhoodAssociationId,
    order = "desc",
  } = query
  const rutConditions = (value: string): Prisma.DeliveryWhereInput[] =>
    rutSearchFragments(value).map((fragment) => ({ beneficiaryRut: { contains: fragment, mode: "insensitive" } }))
  const rutFilter = beneficiaryRut ? rutConditions(beneficiaryRut) : null
  const where: Prisma.DeliveryWhereInput = {
    AND: [
      ...(rutFilter ? [rutFilter.length ? { OR: rutFilter } : { id: { in: [] } }] : []),
      ...(eventId ? [{ eventId }] : []),
    ],
    ...(beneficiary && { beneficiary: { contains: beneficiary, mode: "insensitive" } }),
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
            ...(to && { lte: new Date(`${to}T00:00:00.000Z`) }),
          },
        }
      : {}),
    ...(event === "with" ? { eventId: { not: null } } : event === "without" ? { eventId: null } : {}),
    ...(neighborhoodAssociationId && { neighborhoodAssociationId }),
    ...(supplyId && { items: { some: { supplyId } } }),
    ...(q && {
      OR: [
        ...rutConditions(q),
        ...["folio", "beneficiary", "address"].map((field) => ({
          [field]: { contains: q, mode: "insensitive" },
        })),
        { neighborhoodAssociation: { name: { contains: q, mode: "insensitive" } } },
        ...(/^\d+$/.test(q) && Number(q) <= 2147483647 ? [{ neighborhoodAssociation: { number: Number(q) } }] : []),
        { event: { folio: { contains: q, mode: "insensitive" } } },
      ],
    }),
  }
  const data = await prisma.delivery.findMany({
    where,
    include,
    orderBy: [{ date: order }, { createdAt: order }, { id: order }],
  })
  return {
    data,
    stats: {
      deliveries: data.length,
      units: data.reduce((sum, row) => sum + row.items.reduce((total, item) => total + item.quantity, 0), 0),
      neighborhoods: new Set(
        data.flatMap((row) => (row.neighborhoodAssociationId ? [row.neighborhoodAssociationId] : [])),
      ).size,
    },
  }
}
export async function getDelivery(id: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id }, include })
  if (!delivery) throw new AppError(404, "La entrega no existe.")
  return delivery
}
export async function getDeliveryOptions() {
  const [supplies, requests, neighborhoodAssociations, events] = await Promise.all([
    prisma.supply.findMany({
      select: { id: true, type: true, unit: true },
      orderBy: [{ type: "asc" }, { unit: "asc" }],
    }),
    prisma.request.findMany({
      select: {
        id: true,
        folio: true,
        channel: true,
        delivery: { select: { id: true } },
        event: { select: { id: true, folio: true, date: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.neighborhoodAssociation.findMany({
      select: { id: true, number: true, name: true, active: true },
      orderBy: { number: "asc" },
    }),
    prisma.event.findMany({
      where: { deliveries: { some: {} } },
      select: { id: true, folio: true, address: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
  ])
  return { supplies, requests, neighborhoodAssociations, events }
}
function fail(field: string, message: string, status = 400): never {
  throw new AppError(status, message, { fieldErrors: { [field]: [message] } })
}
function requiredRut(value: unknown) {
  const result = beneficiaryRutSchema.safeParse(value)
  if (!result.success) fail("beneficiaryRut", result.error.issues[0].message)
  return result.data
}
export async function getDeliveryRecurrence(rut: string, now = new Date()) {
  const beneficiaryRut = requiredRut(rut)
  const { from, through, start, end } = deliveryRecurrenceWindow(now)
  const result = await prisma.delivery.aggregate({
    where: { beneficiaryRut, date: { gte: start, lt: end } },
    _count: { _all: true },
    _max: { date: true },
  })
  return { count: result._count._all, from, through, lastDate: result._max.date?.toISOString() ?? null }
}
async function validateRelations(
  tx: Prisma.TransactionClient,
  input: UpdateDeliveryInput,
  id?: string,
  currentAssociationId?: string | null,
) {
  if (input.neighborhoodAssociationId) {
    const associations = await tx.$queryRaw<
      { id: string; active: boolean }[]
    >`SELECT id, active FROM neighborhood_association WHERE id = ${input.neighborhoodAssociationId} FOR SHARE`
    const association = associations[0]
    if (!association) fail("neighborhoodAssociationId", "La junta vecinal ya no existe.")
    if (!association.active && association.id !== currentAssociationId)
      fail("neighborhoodAssociationId", "La junta vecinal está inactiva. Selecciona una junta activa.", 409)
  }
  if (input.items) {
    // Orden estable para que dos entregas con varios insumos no adquieran
    // los bloqueos en orden inverso. FOR SHARE permite altas simultáneas,
    // pero serializa contra edición de unidad o borrado del catálogo.
    const supplies = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM supply WHERE id IN (${Prisma.join(input.items.map((item) => item.supplyId))})
      ORDER BY id FOR SHARE`)
    if (supplies.length !== input.items.length)
      fail("items", "Uno de los insumos ya no existe. Actualiza el formulario.")
  }
  if (input.requestId) {
    // Serializa la asociación a la misma solicitud; el índice único sigue siendo la defensa final.
    await tx.$queryRaw`SELECT id FROM "request" WHERE id = ${input.requestId} FOR UPDATE`
    const request = await tx.request.findUnique({
      where: { id: input.requestId },
      select: { eventId: true, delivery: { select: { id: true } } },
    })
    if (!request) fail("requestId", "La solicitud ya no existe.")
    if (request.delivery && request.delivery.id !== id)
      fail("requestId", "Esa solicitud ya tiene una entrega registrada.", 409)
    if (input.eventId !== undefined && input.eventId !== request.eventId)
      fail("requestId", "La solicitud no pertenece al evento de la entrega. Actualiza el formulario.", 409)
    await assertEvent(tx, request.eventId)
    return request.eventId
  }
  await assertEvent(tx, input.eventId)
  return input.eventId ?? null
}
async function assertEvent(tx: Prisma.TransactionClient, eventId: string | null | undefined) {
  if (!eventId) return
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "event" WHERE id = ${eventId} FOR SHARE`
  if (!rows.length) fail("eventId", "El evento ya no existe. Actualiza el formulario.", 409)
}
function translateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "La entrega no existe.")
    if (error.code === "P2002") {
      const target = String(error.meta?.target ?? "")
      if (target.includes("requestId")) fail("requestId", "Esa solicitud ya tiene una entrega registrada.", 409)
      throw new AppError(409, "El folio ya está ocupado. Vuelve a intentar guardar.")
    }
    if (error.code === "P2003")
      throw new AppError(409, "La junta vecinal, solicitud, evento o un insumo cambió. Actualiza el formulario.")
  }
  throw error
}
export async function updateDelivery(id: string, input: UpdateDeliveryInput, actorId: string) {
  try {
    return await auditedTransaction(actorId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "delivery" WHERE id = ${id} FOR UPDATE`
      const current = await tx.delivery.findUnique({
        where: { id },
        select: { id: true, neighborhoodAssociationId: true, requestId: true, eventId: true, beneficiaryRut: true },
      })
      if (!current) throw new AppError(404, "La entrega no existe.")
      const beneficiaryRut = requiredRut(
        input.beneficiaryRut === undefined ? current.beneficiaryRut : input.beneficiaryRut,
      )
      const changesRelation = input.requestId !== undefined || input.eventId !== undefined
      const eventId = await validateRelations(
        tx,
        {
          ...input,
          ...(changesRelation && { requestId: input.requestId === undefined ? current.requestId : input.requestId }),
          // Editar una entrega directa conserva su evento. Desvincular una
          // solicitud sigue quitando su evento heredado salvo indicación explícita.
          ...(changesRelation &&
            !current.requestId &&
            !input.requestId &&
            input.eventId === undefined && { eventId: current.eventId }),
        },
        id,
        current.neighborhoodAssociationId,
      )
      const { items, ...fields } = input
      if (items) await tx.deliveryItem.deleteMany({ where: { deliveryId: id } })
      return tx.delivery.update({
        where: { id },
        data: {
          ...fields,
          beneficiaryRut,
          ...(changesRelation && { eventId }),
          ...(items && { items: { create: items } }),
        },
        include,
      })
    })
  } catch (error) {
    translateError(error)
  }
}
export async function deleteDelivery(id: string, actorId: string, attachmentIds: string[] = []) {
  try {
    await auditedTransaction(actorId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM delivery WHERE id = ${id} FOR UPDATE`
      await confirmAttachments(tx, { resource: "deliveries", recordId: id }, attachmentIds)
      await tx.delivery.delete({ where: { id } })
    })
    await processDeletions({ resource: "deliveries", recordId: id }).catch(() => undefined)
  } catch (error) {
    translateError(error)
  }
}

export async function createDelivery(input: CreateDeliveryInput, userId: string) {
  const beneficiaryRut = requiredRut(input.beneficiaryRut)
  try {
    return await auditedTransaction(userId, async (tx) => {
      const year = deliveryFolioYear()
      // Todas las altas del año comparten el bloqueo hasta el commit: dos
      // solicitudes concurrentes no pueden reservar el mismo correlativo.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(684103, ${year}::integer)::text`
      const eventId = await validateRelations(tx, input)
      const folios = await tx.delivery.findMany({
        where: { folio: { startsWith: `ENT-${year}-` } },
        select: { folio: true },
      })
      const { items, ...fields } = input
      return tx.delivery.create({
        data: {
          ...fields,
          beneficiaryRut,
          eventId,
          createdBy: userId,
          folio: nextDeliveryFolio(
            folios.map((row) => row.folio),
            year,
          ),
          items: { create: items },
        },
        include,
      })
    })
  } catch (error) {
    translateError(error)
  }
}
