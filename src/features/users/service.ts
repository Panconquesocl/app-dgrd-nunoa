import { auditedTransaction, recordPasswordReset } from "@/features/audit/transaction"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { normalizeRole } from "@/lib/permissions"
import { passwordSchema, userCreateSchema, userEditSchema, type UserCreateInput, type UserEditInput } from "./schemas"
export function allowedUserDomain() {
  return (process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl").trim().toLowerCase()
}
const select = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  role: true,
  banned: true,
  banExpires: true,
  createdAt: true,
  _count: {
    select: {
      eventTypes: true,
      supplies: true,
      neighborhoodAssociations: true,
      events: true,
      requests: true,
      deliveries: true,
      strategicActions: true,
      activities: true,
      evidence: true,
    },
  },
} satisfies Prisma.UserSelect
function isActive(user: { banned: boolean | null; banExpires: Date | null }) {
  return !user.banned || Boolean(user.banExpires && user.banExpires <= new Date())
}
function dto(user: Prisma.UserGetPayload<{ select: typeof select }>) {
  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: normalizeRole(user.role),
    active: isActive(user),
    createdAt: user.createdAt,
    recordCount: Object.values(user._count).reduce((sum, count) => sum + count, 0),
  }
}
async function guardActor(tx: Prisma.TransactionClient, actorId: string) {
  // Serializa las operaciones de cuentas: dos administradores no pueden desactivarse o degradarse a la vez.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(684109, 1)::text`
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: { role: true, banned: true, banExpires: true },
  })
  if (!actor || !isActive(actor) || actor.role !== "admin")
    throw new AppError(403, "Ya no tienes permisos para administrar usuarios.")
}
async function lockTarget(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${id} FOR UPDATE`
  const target = await tx.user.findUnique({ where: { id }, select })
  if (!target) throw new AppError(404, "La cuenta no existe.")
  return target
}
async function keepAdmin(
  tx: Prisma.TransactionClient,
  target: { id: string; role: string | null; banned: boolean | null; banExpires: Date | null },
) {
  if (target.role !== "admin" || !isActive(target)) return
  const admins = await tx.user.count({
    where: {
      id: { not: target.id },
      role: "admin",
      OR: [{ banned: null }, { banned: false }, { banned: true, banExpires: { lte: new Date() } }],
    },
  })
  if (!admins) throw new AppError(409, "Debe permanecer al menos un administrador activo.")
}
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      throw new AppError(409, "Ya existe una cuenta con ese correo.", {
        fieldErrors: { email: ["Ya existe una cuenta con ese correo."] },
      })
    if (error.code === "P2025") throw new AppError(404, "La cuenta no existe.")
    const adapter = error.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined
    if (error.code === "P2003" || adapter?.cause?.originalCode === "23503")
      throw new AppError(409, "La cuenta tiene historial y no puede eliminarse. Debe permanecer inactiva.")
  }
  throw error
}
export async function listUsers(actorId: string) {
  // Revalida el rol en la misma operación que la consulta. No se seleccionan hashes ni tokens.
  return prisma.$transaction(async (tx) => {
    await guardActor(tx, actorId)
    return {
      data: (await tx.user.findMany({ select, orderBy: [{ name: "asc" }, { lastName: "asc" }, { id: "asc" }] })).map(
        dto,
      ),
    }
  })
}
export async function createUser(input: UserCreateInput, actorId: string) {
  const values = userCreateSchema.parse(input)
  if (values.email.split("@")[1] !== allowedUserDomain())
    throw new AppError(400, `Usa un correo institucional (@${allowedUserDomain()}).`, {
      fieldErrors: { email: [`Usa un correo @${allowedUserDomain()}.`] },
    })
  const password = await hashPassword(values.password)
  try {
    return await auditedTransaction(actorId, async (tx) => {
      await guardActor(tx, actorId)
      const id = randomUUID()
      const user = await tx.user.create({
        data: {
          id,
          name: values.name,
          lastName: values.lastName,
          email: values.email,
          role: values.role,
          banned: false,
          accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password } },
        },
        select,
      })
      return dto(user)
    })
  } catch (error) {
    translate(error)
  }
}
export async function updateUser(id: string, input: UserEditInput, actorId: string) {
  const values = userEditSchema.parse(input)
  try {
    return await auditedTransaction(actorId, async (tx) => {
      await guardActor(tx, actorId)
      const current = await lockTarget(tx, id)
      const roleChanged = normalizeRole(current.role) !== values.role
      if (id === actorId && roleChanged) throw new AppError(409, "No puedes cambiar tu propio rol.")
      if (roleChanged && values.role !== "admin") await keepAdmin(tx, current)
      const saved = await tx.user.update({ where: { id }, data: values, select })
      if (roleChanged) await tx.session.deleteMany({ where: { userId: id } })
      return dto(saved)
    })
  } catch (error) {
    translate(error)
  }
}
export async function setUserActive(id: string, active: boolean, actorId: string) {
  try {
    return await auditedTransaction(actorId, async (tx) => {
      await guardActor(tx, actorId)
      const current = await lockTarget(tx, id)
      if (!active && id === actorId) throw new AppError(409, "No puedes desactivar tu propia cuenta.")
      if (!active) await keepAdmin(tx, current)
      const saved = await tx.user.update({
        where: { id },
        data: {
          banned: !active,
          banExpires: null,
          banReason: active ? null : "Cuenta desactivada por administración.",
        },
        select,
      })
      if (!active) await tx.session.deleteMany({ where: { userId: id } })
      return dto(saved)
    })
  } catch (error) {
    translate(error)
  }
}
export async function resetUserPassword(id: string, value: string, actorId: string) {
  const password = await hashPassword(passwordSchema.parse(value))
  try {
    await auditedTransaction(actorId, async (tx) => {
      await guardActor(tx, actorId)
      const target = await lockTarget(tx, id)
      const credential = await tx.account.findFirst({
        where: { userId: id, providerId: "credential" },
        select: { id: true },
      })
      if (credential) await tx.account.update({ where: { id: credential.id }, data: { password } })
      else
        await tx.account.create({
          data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password },
        })
      await tx.session.deleteMany({ where: { userId: id } })
      await recordPasswordReset(tx, target)
    })
  } catch (error) {
    translate(error)
  }
}
export async function deleteUser(id: string, actorId: string) {
  try {
    await auditedTransaction(actorId, async (tx) => {
      await guardActor(tx, actorId)
      const current = await lockTarget(tx, id)
      if (id === actorId) throw new AppError(409, "No puedes eliminar tu propia cuenta.")
      if (isActive(current)) throw new AppError(409, "Solo se pueden eliminar cuentas inactivas. Desactívala primero.")
      if (dto(current).recordCount)
        throw new AppError(409, "La cuenta tiene historial y no puede eliminarse. Debe permanecer inactiva.")
      await tx.user.delete({ where: { id } })
    })
  } catch (error) {
    translate(error)
  }
}
