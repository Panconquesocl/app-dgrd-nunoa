import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/layout/app-header"
import { auth } from "@/lib/auth"

/**
 * Layout de las vistas autenticadas. El middleware sólo mira la cookie; aquí se
 * valida la sesión contra la base de datos, así un token revocado (cierre de
 * sesión) o una cuenta baneada no pasan.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AppHeader name={session.user.name} email={session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
