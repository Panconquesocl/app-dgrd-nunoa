import prisma from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { AppError } from "@/lib/api-error"
import { formatDate } from "@/lib/format"
import { formatRut } from "@/lib/rut"
import { rutSearchFragments } from "@/features/deliveries/search"
import { searchQuerySchema, SEARCH_GROUP_LIMIT, type SearchGroup, type SearchResult } from "./schemas"

export async function searchAll(q: string, role: string | null | undefined) {
  if (!can(role, "search", "read")) throw new AppError(403, "No tienes permisos para realizar esta acción.")
  const { q: term } = searchQuerySchema.parse({ q })
  const text = { contains: term, mode: "insensitive" as const }
  const number = /^\d+$/.test(term) && Number(term) <= 2147483647 ? Number(term) : null
  const take = SEARCH_GROUP_LIMIT + 1
  const jobs: { key: SearchGroup["key"]; label: string; href: string; run: () => Promise<SearchResult[]> }[] = [
    {
      key: "deliveries",
      label: "Entregas",
      href: "/entregas",
      run: async () =>
        (
          await prisma.delivery.findMany({
            where: {
              OR: [
                { folio: text },
                { beneficiary: text },
                { address: text },
                { neighborhoodAssociation: { name: text } },
                { event: { folio: text } },
                ...(number === null ? [] : [{ neighborhoodAssociation: { number } }]),
                ...rutSearchFragments(term).map((fragment) => ({
                  beneficiaryRut: { contains: fragment, mode: "insensitive" as const },
                })),
              ],
            },
            select: { id: true, folio: true, beneficiary: true, beneficiaryRut: true, date: true },
            orderBy: [{ date: "desc" }, { id: "desc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: row.beneficiary,
          description: `${row.folio} · ${row.beneficiaryRut ? formatRut(row.beneficiaryRut) : "Sin RUT registrado"} · ${formatDate(row.date.toISOString())}`,
          href: `/entregas/${row.id}`,
        })),
    },
    {
      key: "neighborhood-associations",
      label: "Juntas vecinales",
      href: "/juntas-vecinales",
      run: async () =>
        (
          await prisma.neighborhoodAssociation.findMany({
            where: { OR: [{ name: text }, ...(number === null ? [] : [{ number }])] },
            select: { id: true, number: true, name: true, active: true },
            orderBy: [{ number: "asc" }, { id: "asc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: `N°${row.number} · ${row.name}`,
          description: row.active ? "Junta vecinal activa" : "Junta vecinal inactiva",
          href: `/juntas-vecinales/${row.id}`,
        })),
    },
    {
      key: "supplies",
      label: "Insumos",
      href: "/insumos",
      run: async () =>
        (
          await prisma.supply.findMany({
            where: { OR: [{ type: text }, { unit: text }] },
            select: { id: true, type: true, unit: true },
            orderBy: [{ type: "asc" }, { id: "asc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: row.type,
          description: `Unidad: ${row.unit}`,
          href: `/insumos/${row.id}`,
        })),
    },
    {
      key: "strategic-actions",
      label: "Acciones estratégicas",
      href: "/plan/acciones",
      run: async () =>
        (
          await prisma.strategicAction.findMany({
            where: {
              OR: [
                { title: text },
                { topics: text },
                { implementation: text },
                ...(number === null ? [] : [{ number }, { year: number }]),
              ],
            },
            select: { id: true, number: true, year: true, title: true, topics: true },
            orderBy: [{ year: "desc" }, { number: "asc" }, { id: "asc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: row.title,
          description: `N°${row.number} · ${row.year} · ${row.topics}`,
          href: `/plan/acciones/${row.id}`,
        })),
    },
    {
      key: "activities",
      label: "Actividades",
      href: "/plan/cronograma",
      run: async () =>
        (
          await prisma.activity.findMany({
            where: {
              OR: [{ objective: text }, { location: text }, { participants: text }, { action: { title: text } }],
            },
            select: { id: true, objective: true, date: true, action: { select: { number: true, year: true } } },
            orderBy: [{ date: "desc" }, { id: "desc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: row.objective,
          description: `Acción N°${row.action.number} · ${row.action.year} · ${formatDate(row.date.toISOString())}`,
          href: `/plan/actividades/${row.id}`,
        })),
    },
    {
      key: "requests",
      label: "Solicitudes",
      href: "/solicitudes",
      run: async () =>
        (
          await prisma.request.findMany({
            where: { OR: [{ folio: text }, { channel: text }, { description: text }, { response: text }] },
            select: { id: true, folio: true, channel: true, createdAt: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take,
          })
        ).map((row) => ({ id: row.id, title: row.folio, description: row.channel, href: `/solicitudes/${row.id}` })),
    },
    {
      key: "events",
      label: "Eventos",
      href: "/eventos",
      run: async () =>
        (
          await prisma.event.findMany({
            where: {
              OR: [
                { folio: text },
                { address: text },
                { institutions: text },
                { actions: text },
                { type: { name: text } },
              ],
            },
            select: { id: true, folio: true, address: true, date: true, type: { select: { name: true } } },
            orderBy: [{ date: "desc" }, { id: "desc" }],
            take,
          })
        ).map((row) => ({
          id: row.id,
          title: row.folio,
          description: `${row.type.name} · ${row.address} · ${formatDate(row.date.toISOString())}`,
          href: `/eventos/${row.id}`,
        })),
    },
  ]
  const groups = await Promise.all(
    jobs
      .filter((job) => can(role, job.key, "read"))
      .map(async ({ run, ...group }) => {
        const rows = await run()
        return { ...group, results: rows.slice(0, SEARCH_GROUP_LIMIT), hasMore: rows.length > SEARCH_GROUP_LIMIT }
      }),
  )
  return { query: term, groups }
}
