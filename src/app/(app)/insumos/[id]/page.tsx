import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SupplyDetailView } from "@/features/supplies/components/supply-detail-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Insumo · DGRD Ñuñoa" }
export default async function InsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Ayudas primera respuesta" }, { label: "Insumos" }, { label: "Detalle", current: true }]}
        user={session?.user}
      />
      <SupplyDetailView id={id} />
    </>
  )
}
