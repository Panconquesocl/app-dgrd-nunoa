import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { can } from "@/lib/permissions"
import { AppError } from "@/lib/api-error"
import { auditedTransaction } from "@/features/audit/transaction"
import { inspectFile } from "./files"
import { storageConfig, putObject, removeObject } from "./storage"
import { type Owner, type Kind, MAX_GROUP_FILES } from "./schemas"
type Actor = { id: string; role?: string | null }
export const parentWhere = (owner: Owner) =>
  owner.resource === "deliveries"
    ? { deliveryId: owner.recordId }
    : owner.resource === "events"
      ? { eventId: owner.recordId }
      : { activityId: owner.recordId }
export function fileOwner(row: {
  deliveryId: string | null
  eventId: string | null
  activityId: string | null
}): Owner {
  return row.deliveryId
    ? { resource: "deliveries", recordId: row.deliveryId }
    : row.eventId
      ? { resource: "events", recordId: row.eventId }
      : { resource: "activities", recordId: row.activityId! }
}
export async function assertOwner(
  owner: Owner,
  actor: Actor,
  write = false,
  tx: Prisma.TransactionClient = prisma,
  lock = false,
) {
  if (!can(actor.role, owner.resource, write ? "update" : "read"))
    throw new AppError(403, "No tienes permiso para acceder a estos archivos.")
  const table = Prisma.raw(
    owner.resource === "deliveries" ? '"delivery"' : owner.resource === "events" ? '"event"' : '"activity"',
  )
  const labelColumn = Prisma.raw(owner.resource === "activities" ? "objective" : "folio")
  const rows = await tx.$queryRaw<{ id: string; label: string }[]>(
    Prisma.sql`SELECT id, ${labelColumn} AS label FROM ${table} WHERE id=${owner.recordId} ${lock ? Prisma.sql`FOR UPDATE` : Prisma.empty}`,
  )
  if (!rows.length) throw new AppError(404, "El registro ya no existe.")
  return rows[0].label
}
const select = {
  id: true,
  name: true,
  type: true,
  size: true,
  kind: true,
  status: true,
  bucket: true,
  createdAt: true,
} as const
export async function listAttachments(owner: Owner, actor: Actor) {
  await assertOwner(owner, actor)
  return (
    await prisma.evidence.findMany({
      where: parentWhere(owner),
      select,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
  ).map(({ bucket, ...row }) => ({ ...row, available: !!bucket }))
}
export async function uploadAttachment(owner: Owner, kind: Kind, file: File, actor: Actor) {
  await assertOwner(owner, actor, true)
  if (
    (owner.resource === "activities" && kind !== "evidence") ||
    (owner.resource !== "activities" && kind === "evidence") ||
    (owner.resource !== "events" && kind === "alfa")
  )
    throw new AppError(400, "Este grupo no corresponde al registro.")
  const { bucket } = storageConfig()
  const content = await inspectFile(file, kind)
  const pending = await prisma.$transaction(async (tx) => {
    const ownerLabel = await assertOwner(owner, actor, true, tx, true)
    const count = await tx.evidence.count({ where: { ...parentWhere(owner), kind } })
    if (count >= (kind === "alfa" ? 1 : MAX_GROUP_FILES))
      throw new AppError(
        409,
        kind === "alfa" ? "Elimina el Informe ALFA anterior antes de reemplazarlo." : "El grupo ya tiene 20 archivos.",
      )
    return tx.evidence.create({
      data: {
        ...parentWhere(owner),
        kind,
        status: "pending",
        bucket,
        key: `${owner.resource}/${owner.recordId}/${randomUUID()}`,
        name: content.name,
        type: content.type,
        size: content.size,
        createdBy: actor.id,
        ownerLabel,
        uploadExpiresAt: new Date(Date.now() + 15 * 60_000),
      },
    })
  })
  try {
    await putObject(bucket, pending.key, content.body, content.type)
    await auditedTransaction(actor.id, async (tx) => {
      await assertOwner(owner, actor, true, tx, true)
      await tx.evidence.update({
        where: { id: pending.id, status: "pending" },
        data: { status: "ready", uploadExpiresAt: null },
      })
    })
    return { id: pending.id }
  } catch (error) {
    await prisma.evidence.deleteMany({ where: { id: pending.id, status: "pending" } })
    if (error instanceof AppError) throw error
    throw new AppError(503, "No se pudo subir el archivo. El registro está guardado; puedes reintentar la carga.")
  }
}
export async function findAttachment(id: string, actor: Actor, write = false) {
  const row = await prisma.evidence.findUnique({ where: { id } })
  if (!row) throw new AppError(404, "El archivo no existe.")
  await assertOwner(fileOwner(row), actor, write)
  if (row.status !== "ready") throw new AppError(409, "El archivo todavía se está cargando.")
  if (!row.bucket) throw new AppError(409, "Este archivo histórico no está disponible en R2 y requiere revisión.")
  return row
}
export async function deleteAttachment(id: string, actor: Actor) {
  const row = await findAttachment(id, actor, true)
  const owner = fileOwner(row)
  await auditedTransaction(actor.id, async (tx) => {
    await assertOwner(owner, actor, true, tx, true)
    await tx.evidence.delete({ where: { id } })
  })
  await processDeletions(owner).catch(() => undefined)
}
/** Se ejecuta bajo el bloqueo del padre para invalidar confirmaciones desactualizadas. */
export async function confirmAttachments(tx: Prisma.TransactionClient, owner: Owner, expected: string[] = []) {
  const rows = await tx.evidence.findMany({
    where: parentWhere(owner),
    select: { id: true, status: true, bucket: true },
  })
  if (rows.some((row) => !row.bucket))
    throw new AppError(409, "El registro contiene evidencia histórica que debe revisarse antes de eliminarla.")
  if (rows.some((row) => row.status === "pending"))
    throw new AppError(409, "Hay archivos cargándose. Espera antes de eliminar el registro.")
  if (JSON.stringify(rows.map((r) => r.id).sort()) !== JSON.stringify([...new Set(expected)].sort()))
    throw new AppError(
      409,
      "Los archivos asociados cambiaron. Revisa sus previsualizaciones antes de confirmar nuevamente.",
    )
}
export async function processDeletions(owner?: Owner) {
  const jobs = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; bucket: string; key: string; attempts: number }[]>(
      Prisma.sql`SELECT id,bucket,key,attempts FROM r2_object_deletion WHERE "nextAttemptAt"<=now() ${owner ? Prisma.sql`AND resource=${owner.resource} AND "recordId"=${owner.recordId}` : Prisma.empty} ORDER BY "nextAttemptAt" LIMIT ${owner ? 60 : 20} FOR UPDATE SKIP LOCKED`,
    )
    if (rows.length)
      await tx.r2ObjectDeletion.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { nextAttemptAt: new Date(Date.now() + 120_000) },
      })
    return rows
  })
  let deleted = 0
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(
      jobs.slice(offset, offset + 5).map(async (job) => {
        try {
          await removeObject(job.bucket, job.key)
          await prisma.r2ObjectDeletion.deleteMany({ where: { id: job.id } })
          deleted++
        } catch {
          await prisma.r2ObjectDeletion.updateMany({
            where: { id: job.id },
            data: {
              attempts: { increment: 1 },
              nextAttemptAt: new Date(Date.now() + Math.min(3600_000, 30_000 * 2 ** Math.min(job.attempts, 7))),
            },
          })
        }
      }),
    )
  }
  return { processed: jobs.length, deleted }
}
export async function cleanup() {
  await prisma.evidence.deleteMany({ where: { status: "pending", uploadExpiresAt: { lt: new Date() } } })
  return processDeletions()
}
