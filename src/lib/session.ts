import { authorizeUser } from "./authorization"
import type { Resource, Action } from "./permissions"
import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "./auth"
import { AppError } from "./api-error"

/**
 * Sesión actual leída desde las cookies del request, o null si no hay.
 *
 * Va envuelta en `cache()` porque el layout la pide para el guard y cada página
 * vuelve a pedirla para la topbar: sin esto serían dos consultas por render.
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user.banned && (!session.user.banExpires || new Date(session.user.banExpires) > new Date())) return null
  return session
})

/**
 * Usuario autenticado. Lanza 401 si no hay sesión, para que los route handlers
 * solo tengan que dejar que el error llegue a `toErrorResponse`.
 */
export async function requireUser() {
  const session = await getSession()

  if (!session) {
    throw new AppError(401, "Debes iniciar sesión para realizar esta acción.")
  }

  return session.user
}

/** Comprueba permisos con el rol actual de la sesión, nunca con datos del cliente. */
export async function requirePermission(resource: Resource, action: Action) {
  const session = await getSession()
  return authorizeUser(session?.user, resource, action)
}
