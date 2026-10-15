import type { Metadata } from "next"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AssociationsView } from "@/features/neighborhood-associations/components/associations-view"
import { getSession } from "@/lib/session"
export const metadata: Metadata = { title: "Juntas vecinales · DGRD Ñuñoa" }
export default async function JuntasPage() {
  const session = await getSession()
  return (
    <>
      <AppTopbar
        crumbs={[{ label: "Ayudas primera respuesta" }, { label: "Juntas vecinales", current: true }]}
        user={session?.user}
      />
      <AssociationsView />
    </>
  )
}
