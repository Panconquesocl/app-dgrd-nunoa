import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AssociationDetailView } from "@/features/neighborhood-associations/components/association-detail-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Junta vecinal · DGRD Ñuñoa" }
export default async function JuntaPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  return (
    <>
      <AppTopbar crumbs={[{ label: "Juntas vecinales" }, { label: "Detalle", current: true }]} user={session?.user} />
      <AssociationDetailView id={id} />
    </>
  )
}
