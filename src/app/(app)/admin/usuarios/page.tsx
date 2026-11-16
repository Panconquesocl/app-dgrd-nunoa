import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { AppTopbar } from "@/components/layout/app-topbar"
import { UsersView } from "@/features/users/components/users-view"
import { allowedUserDomain } from "@/features/users/service"
export const metadata: Metadata = { title: "Usuarios · DGRD Ñuñoa" }
export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "users", "read")) return <AccessDenied />
  return (
    <>
      <AppTopbar crumbs={[]} user={session.user} />
      <UsersView meId={session.user.id} domain={allowedUserDomain()} />
    </>
  )
}
