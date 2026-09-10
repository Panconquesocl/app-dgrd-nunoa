import { Construction } from "lucide-react"
import { AppTopbar, type Crumb } from "@/components/layout/app-topbar"
import { getSession } from "@/lib/session"

/** Vista de los módulos del sidebar que todavía no se implementan. */
export async function ModulePlaceholder({ crumbs, title }: { crumbs: Crumb[]; title: string }) {
  const session = await getSession()

  return (
    <>
      <AppTopbar crumbs={crumbs} user={session?.user} />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col px-5 py-6 sm:px-7">
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        <div className="bg-surface mt-6 flex flex-col items-center gap-3 rounded-xl border px-6 py-20 text-center">
          <Construction aria-hidden="true" className="text-muted-foreground size-6" />
          <p className="text-[15px] font-semibold">Próximamente</p>
          <p className="text-muted-foreground max-w-[420px] text-[13.5px]">Este módulo aún no está disponible.</p>
        </div>
      </div>
    </>
  )
}
