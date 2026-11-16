import type { Metadata } from "next"
import { SupplyDetailPage } from "@/features/supplies/components/supply-detail-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Insumo · DGRD Ñuñoa" }
export default async function InsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  return <SupplyDetailPage id={id} user={session?.user} />
}
