import type { Metadata } from "next"
import { StrategicActionDetailView } from "@/features/strategic-actions/components/strategic-action-detail-view"
import { getSession } from "@/lib/session"

export const metadata: Metadata = {
  title: "Acción estratégica · DGRD Ñuñoa",
}

export default async function StrategicActionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()])

  return <StrategicActionDetailView id={id} user={session?.user} />
}
