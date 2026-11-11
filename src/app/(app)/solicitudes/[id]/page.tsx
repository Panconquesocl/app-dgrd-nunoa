import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { RequestDetailView } from "@/features/requests/components/request-detail-view"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Solicitud · DGRD Ñuñoa" }

export default async function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  if (!session) redirect("/login")
  if (!can(session.user.role, "requests", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Emergencias" }, { label: "Solicitudes" }, { label: "Detalle", current: true }]}
        user={session.user}
      />
      <RequestDetailView id={id} />
    </>
  )
}
