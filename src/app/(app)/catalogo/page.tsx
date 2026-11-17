import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canAccessConfiguration } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { CatalogView } from "@/features/catalog/components/catalog-view"
export const metadata: Metadata = { title: "Catálogo · DGRD Ñuñoa" }
export default async function CatalogPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!canAccessConfiguration(session.user.role)) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[]} user={session.user} />
      <CatalogView />
    </>
  )
}
