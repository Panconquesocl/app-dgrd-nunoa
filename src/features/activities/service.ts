import { confirmAttachments, processDeletions } from "@/features/attachments/service"
import { auditedTransaction } from "@/features/audit/transaction"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { ActivityInput } from "./schemas"
const actionSelect = { id: true, number: true, year: true, title: true, startDate: true, endDate: true } as const
const select = {
  id: true,
  actionId: true,
  date: true,
  location: true,
  objective: true,
  participants: true,
  createdAt: true,
  action: { select: actionSelect },
  creator: { select: { name: true } },
} satisfies Prisma.ActivitySelect
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    throw new AppError(404, "La actividad no existe.")
  throw error
}
async function assertPeriod(tx: Prisma.TransactionClient, actionId: string, date: Date) {
  // Se serializa contra la edición del periodo en strategic-actions/service.ts.
  const rows = await tx.$queryRaw<
    { id: string; startDate: Date; endDate: Date }[]
  >`SELECT id, "startDate", "endDate" FROM strategic_action WHERE id = ${actionId} FOR SHARE`
  if (!rows.length)
    throw new AppError(409, "La acción estratégica ya no existe.", {
      fieldErrors: { actionId: ["Selecciona otra acción."] },
    })
  if (date < rows[0].startDate || date > rows[0].endDate)
    throw new AppError(400, "La fecha de la actividad debe estar dentro del periodo de la acción estratégica.", {
      fieldErrors: { date: ["Selecciona una fecha dentro del periodo de la acción."] },
    })
}
export async function getActivity(id: string) {
  const activity = await prisma.activity.findUnique({ where: { id }, select })
  if (!activity) throw new AppError(404, "La actividad no existe.")
  return activity
}
export async function getSchedule() {
  // Acciones y actividades de una misma instantánea; no hay filtro por autor.
  const [actions, activities] = await prisma.$transaction(
    [
      prisma.strategicAction.findMany({ select: actionSelect, orderBy: [{ year: "desc" }, { number: "asc" }] }),
      prisma.activity.findMany({ select, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    ],
    { isolationLevel: "RepeatableRead" },
  )
  return { actions, activities }
}
export async function createActivity(input: ActivityInput, userId: string) {
  try {
    return await auditedTransaction(userId, async (tx) => {
      const date = new Date(`${input.date}T00:00:00.000Z`)
      await assertPeriod(tx, input.actionId, date)
      return tx.activity.create({ data: { ...input, date, createdBy: userId }, select })
    })
  } catch (error) {
    translate(error)
  }
}
export async function updateActivity(id: string, input: ActivityInput, actorId: string) {
  try {
    return await auditedTransaction(actorId, async (tx) => {
      const date = new Date(`${input.date}T00:00:00.000Z`)
      await assertPeriod(tx, input.actionId, date)
      return tx.activity.update({ where: { id }, data: { ...input, date }, select })
    })
  } catch (error) {
    translate(error)
  }
}
export async function deleteActivity(id: string, actorId: string, attachmentIds: string[] = []) {
  try {
    await auditedTransaction(actorId, async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM activity WHERE id = ${id} FOR UPDATE`
      if (!rows.length) throw new AppError(404, "La actividad no existe.")
      await confirmAttachments(tx, { resource: "activities", recordId: id }, attachmentIds)
      await tx.activity.delete({ where: { id } })
    })
    await processDeletions({ resource: "activities", recordId: id }).catch(() => undefined)
  } catch (error) {
    translate(error)
  }
}
