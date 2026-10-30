import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata: Metadata = { title: "Solicitudes · DGRD Ñuñoa" }

export default async function SolicitudesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "requests", "read")) return <AccessDenied />
  return (
    <ModulePlaceholder
      crumbs={[{ label: "Emergencias" }, { label: "Solicitudes", current: true }]}
      title="Solicitudes"
    />
  )
}
