import { AppError } from "./api-error"
import { can, type Resource, type Action } from "./permissions"

export function authorizeUser<T extends { role?: string | null }>(
  user: T | null | undefined,
  resource: Resource,
  action: Action,
): T {
  if (!user) throw new AppError(401, "Debes iniciar sesión para realizar esta acción.")
  if (!can(user.role, resource, action)) {
    throw new AppError(403, "No tienes permisos para realizar esta acción.")
  }
  return user
}
