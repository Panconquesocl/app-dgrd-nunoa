"use client"

import { SectionEyebrow } from "@/components/layout/section-eyebrow"
import { usePermission } from "@/providers/permissions"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Filter, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useStrategicActions } from "../queries"
import type { StrategicActionListItem } from "../schemas"
import { DeleteActionDialog, type DeletableAction } from "./delete-action-dialog"
import { StrategicActionFormDialog } from "./strategic-action-form-dialog"
import "@/features/deliveries/components/deliveries.css"

const ALL_YEARS = "all"

export function StrategicActionsView() {
  const canManage = usePermission("strategic-actions", "update")
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [year, setYear] = useState(ALL_YEARS)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DeletableAction | null>(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data, isPending, isError, error, refetch } = useStrategicActions({
    q: debouncedSearch || undefined,
    year: year === ALL_YEARS ? undefined : Number(year),
  })

  const actions = data?.data ?? []
  const hasFilters = Boolean(debouncedSearch) || year !== ALL_YEARS

  function openDelete(action: StrategicActionListItem) {
    setPendingDelete({
      id: action.id,
      number: action.number,
      year: action.year,
      title: action.title,
      activityCount: action._count.activities,
    })
  }

  return (
    <div className="delivery-page flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Plan RRD</SectionEyebrow>
          <h1 className="text-[26px] font-semibold tracking-tight">Acciones estratégicas</h1>
          <p className="text-muted-foreground mt-1 text-[13.5px]">
            Objetivos del Plan de Reducción del Riesgo de Desastres y las actividades que derivan de ellos.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="size-4" />
            Nueva acción
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-[340px] sm:min-w-[240px] sm:flex-none">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título o tema…"
            aria-label="Buscar acciones por título o tema"
            className="pl-9"
          />
        </div>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger aria-label="Filtrar por año" className="min-w-[170px]">
            <Filter aria-hidden="true" className="text-muted-foreground size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_YEARS}>Todos los años</SelectItem>
            {data?.availableYears.map((availableYear) => (
              <SelectItem key={availableYear} value={String(availableYear)}>
                {availableYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-surface mt-4 overflow-hidden rounded-xl border">
        {isError ? (
          <EmptyState
            title="No se pudo cargar el listado."
            description={error instanceof Error ? error.message : undefined}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : isPending ? (
          <TableSkeleton />
        ) : actions.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Sin resultados" : "Todavía no hay acciones estratégicas"}
            description={
              hasFilters
                ? "Prueba con otro término de búsqueda o cambia el año."
                : canManage
                  ? "Crea la primera acción para empezar a registrar el Plan RRD."
                  : "Un administrador debe registrar las acciones del Plan RRD."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("")
                    setYear(ALL_YEARS)
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : canManage ? (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="size-4" />
                  Nueva acción
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:text-muted-foreground [&>th]:h-11 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:uppercase">
                  <TableHead className="w-[64px] pl-5">N°</TableHead>
                  <TableHead className="min-w-[320px]">Título</TableHead>
                  <TableHead className="w-[88px]">Año</TableHead>
                  <TableHead className="w-[130px]">Inicio</TableHead>
                  <TableHead className="w-[130px]">Término</TableHead>
                  <TableHead className="w-[120px]">Actividades</TableHead>
                  <TableHead className="w-[110px] pr-5">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {actions.map((action) => (
                  <TableRow
                    key={action.id}
                    onClick={() => router.push(`/plan/acciones/${action.id}`)}
                    className="group cursor-pointer [&>td]:py-4"
                  >
                    <TableCell className="pl-5 font-semibold">{action.number}</TableCell>
                    <TableCell className="font-semibold">
                      <Link
                        href={`/plan/acciones/${action.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="focus-visible:ring-ring rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {action.title}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{action.year}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[12.5px]">
                      {formatDate(action.startDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[12.5px]">
                      {formatDate(action.endDate)}
                    </TableCell>
                    <TableCell>
                      {action._count.activities > 0 ? (
                        <span className="bg-secondary text-secondary-foreground inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums">
                          {action._count.activities}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" aria-label="Sin actividades">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1",
                          "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
                        )}
                      >
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/plan/acciones/${action.id}`} onClick={(event) => event.stopPropagation()}>
                            Ver
                          </Link>
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar la acción N°${action.number} de ${action.year}`}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation()
                              openDelete(action)
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {canManage && <StrategicActionFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />}
      {canManage && (
        <DeleteActionDialog action={pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)} />
      )}
    </div>
  )
}

function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="text-muted-foreground max-w-[420px] text-[13.5px]">{description}</p>}
      {action}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5" aria-busy="true" aria-label="Cargando acciones">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  )
}
