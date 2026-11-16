import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"

/** Contexto local a la transacción: los triggers auditan también cascadas y vínculos derivados. */
export async function auditedTransaction<T>(actorId: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (!actorId) throw new AppError(401, "No se pudo identificar al usuario que realiza la operación.")
  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true, name: true, lastName: true, email: true },
      })
      if (!actor) throw new AppError(401, "No se pudo identificar al usuario que realiza la operación.")
      const snapshot = JSON.stringify({
        id: actor.id,
        name: [actor.name, actor.lastName].filter(Boolean).join(" "),
        email: actor.email,
      })
      await tx.$queryRaw`SELECT set_config('app.audit_actor', ${snapshot}, true), set_config('app.audit_operation_id', ${randomUUID()}, true)`
      return work(tx)
    },
    { maxWait: 10000, timeout: 15000 },
  )
}

/** Solo registra el hecho del restablecimiento; nunca recibe una contraseña ni su hash. */
export async function recordPasswordReset(
  tx: Prisma.TransactionClient,
  target: { id: string; name: string; email: string },
) {
  await tx.$executeRaw`
    INSERT INTO audit_log ("operationId", "actorId", "actorName", "actorEmail", resource, action, "entityId", "entityLabel", "before", "after")
    SELECT current_setting('app.audit_operation_id'), actor->>'id', actor->>'name', actor->>'email',
      'users', 'update', ${target.id}, ${target.email}, NULL, '{"passwordReset":true}'::jsonb
    FROM (SELECT current_setting('app.audit_actor')::jsonb AS actor) context`
}
