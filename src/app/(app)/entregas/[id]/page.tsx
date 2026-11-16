import type { Metadata } from "next"
import { DeliveryDetailPage } from "@/features/deliveries/components/delivery-detail-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Entrega · DGRD Ñuñoa" }
export default async function EntregaPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  return <DeliveryDetailPage id={id} user={session?.user} />
}
