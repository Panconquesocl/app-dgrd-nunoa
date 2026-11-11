import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { StrategicActionsView } from "@/features/strategic-actions/components/strategic-actions-view"
import { getSession } from "@/lib/session"

export const metadata: Metadata = {
  title: "Acciones estratégicas · DGRD Ñuñoa",
  description: "Objetivos del Plan de Reducción del Riesgo de Desastres de la comuna.",
}

export default async function StrategicActionsPage() {
  const session = await getSession()

  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Plan RRD" }, { label: "Acciones estratégicas", current: true }]}
        user={session?.user}
      />
      <StrategicActionsView />
    </>
  )
}
