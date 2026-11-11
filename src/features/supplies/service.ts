import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { ListSuppliesQuery, SupplyPayload, SupplyPatch } from "./schemas"

const listSelect = {
  id: true,
  type: true,
  unit: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.SupplySelect

export async function listSupplies({ q }: ListSuppliesQuery = {}) {
  const data = await prisma.supply.findMany({
    where: q ? { type: { contains: q, mode: "insensitive" } } : undefined,
    select: listSelect,
    orderBy: [{ type: "asc" }, { unit: "asc" }, { id: "asc" }],
  })
  return { data }
}

export async function getSupply(id: string, order: "asc" | "desc" = "desc") {
  const supply = await prisma.supply.findUnique({
    where: { id },
    select: {
      ...listSelect,
      creator: { select: { id: true, name: true } },
      items: {
        select: {
          quantity: true,
          delivery: {
            select: {
              id: true,
              folio: true,
              date: true,
              beneficiary: true,
              event: { select: { id: true, folio: true } },
            },
          },
        },
        orderBy: [{ delivery: { date: order } }, { deliveryId: order }],
      },
    },
  })
  if (!supply) throw new AppError(404, "El insumo no existe.")
  return { ...supply, totalDistributed: supply.items.reduce((sum, item) => sum + item.quantity, 0) }
}

function duplicateSupplyError() {
  return new AppError(409, "Ya existe un insumo con este nombre y unidad.", {
    fieldErrors: { type: ["Ya existe un insumo con este nombre y unidad."] },
  })
}
async function assertUnique(tx: Prisma.TransactionClient, type: string, unit: string, id?: string) {
  const duplicates = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM supply
    WHERE lower(btrim(type)) = lower(btrim(${type}))
      AND lower(btrim(unit)) = lower(btrim(${unit}))
      AND (${id ?? null}::text IS NULL OR id <> ${id ?? null}) LIMIT 1`
  if (duplicates.length) throw duplicateSupplyError()
}
function inUseError(count: number) {
  return new AppError(
    409,
    `El insumo está referenciado en ${count} ${count === 1 ? "entrega" : "entregas"} y no puede eliminarse.`,
    { details: { deliveryCount: count } },
  )
}
function translateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw duplicateSupplyError()
    if (error.code === "P2025") throw new AppError(404, "El insumo no existe.")
  }
  throw error
}
export async function createSupply(input: SupplyPayload, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertUnique(tx, input.type, input.unit)
      return tx.supply.create({ data: { ...input, createdBy: userId }, select: listSelect })
    })
  } catch (error) {
    translateError(error)
  }
}
export async function updateSupply(id: string, input: SupplyPatch) {
  try {
    return await prisma.$transaction(async (tx) => {
      // FOR UPDATE también bloquea la referencia del insumo desde nuevas entregas.
      await tx.$queryRaw`SELECT id FROM supply WHERE id = ${id} FOR UPDATE`
      const current = await tx.supply.findUnique({ where: { id }, select: { type: true, unit: true } })
      if (!current) throw new AppError(404, "El insumo no existe.")
      if (input.unit !== undefined && input.unit !== current.unit) {
        const count = await tx.deliveryItem.count({ where: { supplyId: id } })
        if (count > 0)
          throw new AppError(409, "No se puede cambiar la unidad de un insumo incluido en entregas.", {
            fieldErrors: { unit: ["Este insumo ya está en uso. Crea otro insumo para una unidad diferente."] },
            details: { deliveryCount: count },
          })
      }
      await assertUnique(tx, input.type ?? current.type, input.unit ?? current.unit, id)
      return tx.supply.update({ where: { id }, data: input, select: listSelect })
    })
  } catch (error) {
    translateError(error)
  }
}
export async function deleteSupply(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM supply WHERE id = ${id} FOR UPDATE`
      const current = await tx.supply.findUnique({ where: { id }, select: { id: true } })
      if (!current) throw new AppError(404, "El insumo no existe.")
      const count = await tx.deliveryItem.count({ where: { supplyId: id } })
      if (count > 0) throw inUseError(count)
      await tx.supply.delete({ where: { id } })
    })
  } catch (error) {
    // La FK onDelete: Restrict es la última defensa, incluso para escritores externos.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const count = await prisma.deliveryItem.count({ where: { supplyId: id } })
      throw inUseError(Math.max(count, 1))
    }
    translateError(error)
  }
}
