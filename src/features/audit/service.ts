import prisma from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { auditQuerySchema, type AuditQuery } from "./schemas"

export async function listAudit(input: AuditQuery) {
  const query = auditQuerySchema.parse(input)
  const [dates] = await prisma.$queryRaw<{ start: Date | null; end: Date | null }[]>`
    SELECT (${query.from ?? null}::date::timestamp AT TIME ZONE 'America/Santiago') AS start,
      ((${query.to ?? null}::date + 1)::timestamp AT TIME ZONE 'America/Santiago') AS "end"`
  const where: Prisma.AuditLogWhereInput = {
    ...(query.resource && { resource: query.resource }),
    ...(query.action && { action: query.action }),
    ...(query.actorId && { actorId: query.actorId }),
    ...((dates.start || dates.end) && {
      createdAt: { ...(dates.start && { gte: dates.start }), ...(dates.end && { lt: dates.end }) },
    }),
  }
  const data = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    take: 51,
  })
  const entries = data.slice(0, 50)
  return { data: entries, nextCursor: data.length > 50 ? entries.at(-1)!.id : null }
}
export async function getAuditActors() {
  return prisma.auditLog.findMany({
    distinct: ["actorId"],
    select: { actorId: true, actorName: true, actorEmail: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
}
