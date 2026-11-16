import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AccessDenied } from "@/components/layout/access-denied"
import { AuditView } from "@/features/audit/components/audit-view"
export default async function AuditPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "audit", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[{ label: "Administración" }, { label: "Auditoría", current: true }]} user={session.user} />
      <AuditView viewerKey={`${session.user.id}:${session.user.role}`} />
    </>
  )
}
