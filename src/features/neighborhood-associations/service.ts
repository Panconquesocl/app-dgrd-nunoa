import { summarizeAssociationHistory } from "./history"
import type { AssociationHistoryQuery } from "./schemas"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type {
  ListNeighborhoodAssociationsQuery,
  NeighborhoodAssociationPayload,
  NeighborhoodAssociationPatch,
} from "./schemas"
const select = {
  id: true,
  number: true,
  name: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { deliveries: true } },
} satisfies Prisma.NeighborhoodAssociationSelect
export async function listNeighborhoodAssociations({ q, status = "all" }: ListNeighborhoodAssociationsQuery = {}) {
  const number = q && /^\d+$/.test(q) ? Number(q) : undefined
  const data = await prisma.neighborhoodAssociation.findMany({
    where: {
      ...(status !== "all" && { active: status === "active" }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          ...(number !== undefined && number <= 2147483647 ? [{ number }] : []),
        ],
      }),
    },
    select,
    orderBy: [{ number: "asc" }, { id: "asc" }],
  })
  return { data }
}
export async function getNeighborhoodAssociation(id: string, query: AssociationHistoryQuery | "asc" | "desc" = {}) {
  // Preserve the existing internal order-only call signature.
  const { order = "desc", from, to, supplyId } = typeof query === "string" ? { order: query } : query
  const where: Prisma.DeliveryWhereInput = {
    ...((from || to) && {
      date: {
        ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
        ...(to && { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000) }),
      },
    }),
    ...(supplyId && { items: { some: { supplyId } } }),
  }
  const [association, availableSupplies] = await Promise.all([
    prisma.neighborhoodAssociation.findUnique({
      where: { id },
      select: {
        ...select,
        deliveries: {
          where,
          select: {
            id: true,
            folio: true,
            beneficiary: true,
            date: true,
            items: {
              ...(supplyId && { where: { supplyId } }),
              select: { quantity: true, supply: { select: { id: true, type: true, unit: true } } },
              orderBy: { supplyId: "asc" },
            },
          },
          orderBy: [{ date: order }, { id: order }],
        },
      },
    }),
    // Options cover this association's entire history, independently of current filters.
    prisma.supply.findMany({
      where: { items: { some: { delivery: { neighborhoodAssociationId: id } } } },
      select: { id: true, type: true, unit: true },
      orderBy: [{ type: "asc" }, { unit: "asc" }, { id: "asc" }],
    }),
  ])
  if (!association) throw new AppError(404, "La junta vecinal no existe.")
  return {
    ...association,
    availableSupplies,
    ...summarizeAssociationHistory(association.deliveries),
    totalUnits: association.deliveries.reduce(
      (sum, delivery) => sum + delivery.items.reduce((total, item) => total + item.quantity, 0),
      0,
    ),
  }
}
function inUseError(count: number) {
  return new AppError(
    409,
    `La junta tiene ${count} ${count === 1 ? "entrega asociada" : "entregas asociadas"}. Puedes desactivarla para conservar su historial.`,
    { details: { deliveryCount: count } },
  )
}
function translateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      throw new AppError(409, "Ya existe una junta vecinal con ese número.", {
        fieldErrors: { number: ["Este número ya está asignado a otra junta."] },
      })
    if (error.code === "P2025") throw new AppError(404, "La junta vecinal no existe.")
  }
  throw error
}
export async function createNeighborhoodAssociation(input: NeighborhoodAssociationPayload, userId: string) {
  try {
    return await prisma.neighborhoodAssociation.create({ data: { ...input, createdBy: userId }, select })
  } catch (error) {
    translateError(error)
  }
}
export async function updateNeighborhoodAssociation(id: string, input: NeighborhoodAssociationPatch) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Compatible con FOR SHARE al asociar entregas: la desactivación y las
      // asociaciones nuevas tienen un orden definido, incluso con concurrencia.
      await tx.$queryRaw`SELECT id FROM neighborhood_association WHERE id = ${id} FOR UPDATE`
      return tx.neighborhoodAssociation.update({ where: { id }, data: input, select })
    })
  } catch (error) {
    translateError(error)
  }
}
export async function deleteNeighborhoodAssociation(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM neighborhood_association WHERE id = ${id} FOR UPDATE`
      if (!(await tx.neighborhoodAssociation.findUnique({ where: { id }, select: { id: true } })))
        throw new AppError(404, "La junta vecinal no existe.")
      const count = await tx.delivery.count({ where: { neighborhoodAssociationId: id } })
      if (count > 0) throw inUseError(count)
      await tx.neighborhoodAssociation.delete({ where: { id } })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      throw inUseError(Math.max(1, await prisma.delivery.count({ where: { neighborhoodAssociationId: id } })))
    translateError(error)
  }
}
