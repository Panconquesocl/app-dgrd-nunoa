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
  return auth.api.getSession({ headers: await headers() })
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
