import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { ConfigurationView } from "@/features/event-types/components/configuration-view"
export const metadata: Metadata = { title: "Configuración · DGRD Ñuñoa" }
export default async function ConfigurationPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "event-types", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[]} user={session.user} />
      <ConfigurationView />
    </>
  )
}
