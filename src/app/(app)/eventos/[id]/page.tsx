import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { EventDetailView } from "@/features/events/components/event-detail-view"
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "events", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Emergencias" }, { label: "Eventos" }, { label: "Detalle", current: true }]}
        user={session.user}
      />
      <EventDetailView id={(await params).id} />
    </>
  )
}
