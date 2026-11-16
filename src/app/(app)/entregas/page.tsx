import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { DeliveriesView } from "@/features/deliveries/components/deliveries-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Entregas · DGRD Ñuñoa" }
export default async function EntregasPage() {
  const session = await getSession()
  return (
    <>
      <AppTopbar crumbs={[]} user={session?.user} />
      <DeliveriesView />
    </>
  )
}
