import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SuppliesView } from "@/features/supplies/components/supplies-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Insumos · DGRD Ñuñoa" }
export default async function InsumosPage() {
  const session = await getSession()
  return (
    <>
      <AppTopbar crumbs={[]} user={session?.user} />
      <SuppliesView />
    </>
  )
}
