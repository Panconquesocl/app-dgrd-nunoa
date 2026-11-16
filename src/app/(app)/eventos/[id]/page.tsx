import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { EventDetailPage } from "@/features/events/components/event-detail-view"
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "events", "read")) return <AccessDenied />
  return <EventDetailPage id={(await params).id} user={session.user} />
}
