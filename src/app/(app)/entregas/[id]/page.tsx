import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { DeliveryDetailView } from "@/features/deliveries/components/delivery-detail-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Entrega · DGRD Ñuñoa" }
export default async function EntregaPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Ayudas primera respuesta" }, { label: "Entregas" }, { label: "Detalle", current: true }]}
        user={session?.user}
      />
      <DeliveryDetailView id={id} />
    </>
  )
}
