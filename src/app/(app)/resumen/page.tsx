import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can, normalizeRole } from "@/lib/permissions"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AccessDenied } from "@/components/layout/access-denied"
import { SummaryView } from "@/features/summary/components/summary-view"
import { currentSummaryYear } from "@/features/summary/schemas"
export const metadata: Metadata = { title: "Resumen · DGRD Ñuñoa" }
export default async function SummaryPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "summary", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[{ label: "General" }, { label: "Resumen", current: true }]} user={session.user} />
      <SummaryView
        initialYear={currentSummaryYear()}
        viewerKey={`${session.user.id}:${normalizeRole(session.user.role)}`}
      />
    </>
  )
}
