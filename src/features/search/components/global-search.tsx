"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, LoaderCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { usePermission } from "@/providers/permissions"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useGlobalSearch } from "../queries"

export function GlobalSearch({ viewerKey }: { viewerKey: string }) {
  const [open, setOpen] = useState(false)
  const allowed = usePermission("search", "read")
  useEffect(() => {
    if (!allowed) return
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [allowed])
  if (!allowed) return null
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 lg:w-52 lg:justify-start" aria-label="Abrir búsqueda global">
          <Search size={16} aria-hidden="true" />
          <span className="hidden lg:inline">Buscar en el sistema…</span>
        </Button>
      </DialogTrigger>
      {open && <GlobalSearchContent viewerKey={viewerKey} onNavigate={() => setOpen(false)} />}
    </Dialog>
  )
}

function GlobalSearchContent({ viewerKey, onNavigate }: { viewerKey: string; onNavigate: () => void }) {
  const [value, setValue] = useState("")
  const term = value.trim()
  const debounced = useDebouncedValue(term)
  const restrictedAccess = `${usePermission("requests", "read")}:${usePermission("events", "read")}`
  const ready = term.length >= 2 && term === debounced
  const query = useGlobalSearch(debounced, viewerKey, restrictedAccess, ready)
  const groups = ready ? (query.data?.groups.filter((group) => group.results.length > 0) ?? []) : []
  const results = useRef<HTMLDivElement>(null)
  return (
    <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b px-5 pt-5 pb-4 text-left">
        <DialogTitle>Búsqueda global</DialogTitle>
        <DialogDescription>Busca por nombre, RUT, folio o texto. Abre con Ctrl/⌘ K.</DialogDescription>
        <div className="relative mt-2">
          <Search
            size={16}
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            aria-label="Buscar en todos los módulos autorizados"
            placeholder="Escribe al menos dos caracteres…"
            value={value}
            maxLength={200}
            className="h-10 pl-10"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                const first = results.current?.querySelector<HTMLAnchorElement>("a[data-search-result]")
                if (first) {
                  event.preventDefault()
                  first.focus()
                }
              }
            }}
          />
        </div>
      </DialogHeader>
      <div
        ref={results}
        className="min-h-0 overflow-y-auto p-3"
        aria-busy={ready && query.isFetching}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
          const links = Array.from(results.current?.querySelectorAll<HTMLAnchorElement>("a[data-search-result]") ?? [])
          const index = links.indexOf(event.target as HTMLAnchorElement)
          if (index < 0) return
          event.preventDefault()
          links[(index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus()
        }}
      >
        {term.length < 2 ? (
          <p className="text-muted-foreground px-2 py-6 text-center">Escribe al menos dos caracteres para buscar.</p>
        ) : !ready || query.isFetching ? (
          <p className="text-muted-foreground flex items-center justify-center gap-2 py-6" role="status">
            <LoaderCircle size={16} className="animate-spin" />
            Buscando…
          </p>
        ) : query.isError ? (
          <div className="space-y-3 p-4 text-center" role="alert">
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center" role="status">
            No se encontraron resultados para «{term}».
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <h2 className="text-muted-foreground text-xs font-semibold uppercase">{group.label}</h2>
                <Link href={group.href} onClick={onNavigate} className="text-muted-foreground text-xs hover:underline">
                  Ir al módulo
                </Link>
              </div>
              <ul>
                {group.results.map((row) => (
                  <li key={row.id}>
                    <Link
                      data-search-result
                      href={row.href}
                      onClick={onNavigate}
                      className="hover:bg-accent focus-visible:bg-accent flex items-center justify-between gap-3 rounded-md p-3 outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{row.title}</span>
                        <span className="text-muted-foreground mt-1 block truncate text-xs">{row.description}</span>
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              {group.hasMore && (
                <p className="text-muted-foreground px-3 pt-1 text-xs">
                  Mostrando los primeros {group.results.length} resultados. Hay más en este módulo.
                </p>
              )}
            </section>
          ))
        )}
      </div>
    </DialogContent>
  )
}
