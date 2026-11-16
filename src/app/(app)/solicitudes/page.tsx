import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { RequestsView } from "@/features/requests/components/requests-view"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Solicitudes · DGRD Ñuñoa" }

export default async function SolicitudesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "requests", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[]} user={session.user} />
      <RequestsView />
    </>
  )
}
