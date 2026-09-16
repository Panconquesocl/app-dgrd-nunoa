import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { ErrorSolicitud } from "./validation"

async function obtenerUsuario() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session?.user ?? null
}

export async function exigirUsuarioPagina() {
  const user = await obtenerUsuario()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function exigirUsuarioAccion() {
  const user = await obtenerUsuario()

  if (!user) {
    throw new ErrorSolicitud("Tu sesión no está disponible. Vuelve a iniciar sesión.")
  }

  return user
}
