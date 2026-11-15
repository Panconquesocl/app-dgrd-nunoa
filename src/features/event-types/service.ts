import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { EventTypeInput } from "./schemas"

const select = { id: true, name: true, _count: { select: { events: true } } } satisfies Prisma.EventTypeSelect
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "El tipo de evento no existe.")
    if (error.code === "P2002")
      throw new AppError(409, "Ya existe un tipo con ese nombre.", {
        fieldErrors: { name: ["Ya existe un tipo con ese nombre."] },
      })
    // Prisma 7 con adapter-pg puede envolver la violación de FK como P2010.
    const adapter = error.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined
    if (error.code === "P2003" || adapter?.cause?.originalCode === "23503")
      throw new AppError(409, "El tipo está en uso por eventos y no puede eliminarse.")
  }
  throw error
}
export async function listEventTypes() {
  return { data: await prisma.eventType.findMany({ select, orderBy: [{ name: "asc" }, { id: "asc" }] }) }
}
export async function createEventType(input: EventTypeInput, userId: string) {
  try {
    return await prisma.eventType.create({ data: { ...input, createdBy: userId }, select })
  } catch (error) {
    translate(error)
  }
}
export async function updateEventType(id: string, input: EventTypeInput) {
  try {
    return await prisma.eventType.update({ where: { id }, data: input, select })
  } catch (error) {
    translate(error)
  }
}
export async function deleteEventType(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event_type WHERE id = ${id} FOR UPDATE`
      if (!rows.length) throw new AppError(404, "El tipo de evento no existe.")
      const count = await tx.event.count({ where: { typeId: id } })
      if (count)
        throw new AppError(
          409,
          `El tipo está en uso por ${count} ${count === 1 ? "evento" : "eventos"} y no puede eliminarse.`,
          { details: { count } },
        )
      await tx.eventType.delete({ where: { id } })
    })
  } catch (error) {
    translate(error)
  }
}
