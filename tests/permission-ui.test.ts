import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type {
  AssociationSupply,
  AssociationSupplySummary,
  AssociationHistoryDelivery,
} from "../src/features/neighborhood-associations/schemas"
import { PermissionsProvider } from "../src/providers/permissions"

const file = (path: string) => pathToFileURL(resolve(path)).href
mock.module(file("src/components/auth/sign-out-button.tsx"), { namedExports: { SignOutButton: () => null } })
mock.module(file("src/features/summary/queries.ts"), {
  namedExports: { useNavigationCounts: () => ({ data: { deliveries: 10, requests: 4, events: 2 }, isError: false }) },
})
mock.module(file("src/features/deliveries/components/deliveries.css"), { namedExports: {} })
mock.module(file("src/components/layout/app-sidebar.css"), { namedExports: {} })
mock.module(file("src/features/event-types/components/configuration.css"), { namedExports: {} })
mock.module(file("src/features/event-types/queries.ts"), {
  namedExports: {
    useEventTypes: () => {
      eventTypeReads++
      return { data: { data: [] }, isPending: false, isFetching: false, isError: false }
    },
    useSaveEventType: () => ({}),
    useDeleteEventType: () => ({}),
  },
})

mock.module(file("src/features/activities/components/plan-tabs.tsx"), { namedExports: { PlanTabs: () => null } })
mock.module(file("src/features/activities/components/activity-form-dialog.tsx"), {
  namedExports: { ActivityFormDialog: () => createElement("div", null, "ACTIVITY_DIALOG") },
})
let role: string | null = "user"
let eventTypeReads = 0
let populated = false
const association = {
  id: "junta",
  number: 1,
  name: "Junta de prueba",
  active: true,
  _count: { deliveries: 0 },
  totalUnits: 0,
  filteredDeliveryCount: 0,
  availableSupplies: [] as AssociationSupply[],
  supplyBreakdown: [] as AssociationSupplySummary[],
  totalsByUnit: [] as { unit: string; quantity: number }[],
  deliveries: [] as AssociationHistoryDelivery[],
}
const strategicAction = {
  id: "accion",
  number: 1,
  year: 2026,
  title: "Acción de prueba",
  topics: "Tema",
  implementation: "Plan",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  _count: { activities: 0 },
  activities: [],
}
mock.module("next/navigation", {
  namedExports: {
    usePathname: () => "/juntas-vecinales",
    useRouter: () => ({ push() {} }),
    redirect: () => {
      throw new Error("redirect")
    },
  },
})
mock.module(file("src/lib/session.ts"), {
  namedExports: { getSession: async () => (role === null ? null : { user: { name: "Operador", role } }) },
})
mock.module(file("src/features/neighborhood-associations/queries.ts"), {
  namedExports: {
    useNeighborhoodAssociations: () => ({ data: { data: populated ? [association] : [] }, isPending: false }),
    useNeighborhoodAssociation: () => ({ data: association, isPending: false }),
  },
})
mock.module(file("src/features/strategic-actions/queries.ts"), {
  namedExports: {
    useStrategicActions: () => ({
      data: { data: populated ? [strategicAction] : [], availableYears: [] },
      isPending: false,
    }),
    useStrategicAction: () => ({ data: strategicAction, isPending: false }),
  },
})
// Count dialog mounts without querying a database or running mutations.
for (const [path, name] of [
  ["neighborhood-associations/components/association-form-dialog", "AssociationFormDialog"],
  ["neighborhood-associations/components/delete-association-dialog", "DeleteAssociationDialog"],
  ["strategic-actions/components/strategic-action-form-dialog", "StrategicActionFormDialog"],
  ["strategic-actions/components/delete-action-dialog", "DeleteActionDialog"],
]) {
  mock.module(file(`src/features/${path}.tsx`), {
    namedExports: { [name]: () => createElement("div", null, "ADMIN_DIALOG") },
  })
}
mock.module(file("src/components/layout/module-placeholder.tsx"), {
  namedExports: { ModulePlaceholder: () => createElement("div", null, "RESTRICTED_CONTENT") },
})
// Solicitudes ya no es placeholder: su vista cliente cuenta como contenido restringido.
mock.module(file("src/features/requests/components/requests-view.tsx"), {
  namedExports: { RequestsView: () => createElement("div", null, "RESTRICTED_CONTENT") },
})

mock.module(file("src/features/events/components/events-view.tsx"), {
  namedExports: { EventsView: () => createElement("div", null, "RESTRICTED_CONTENT") },
})

mock.module(file("src/features/events/components/event-detail-view.tsx"), {
  namedExports: { EventDetailPage: () => createElement("div", null, "RESTRICTED_CONTENT") },
})

mock.module(file("src/features/audit/components/audit-view.tsx"), {
  namedExports: { AuditView: () => createElement("div", null, "RESTRICTED_CONTENT") },
})

mock.module(file("src/features/users/components/users-view.tsx"), {
  namedExports: { UsersView: () => createElement("div", null, "RESTRICTED_CONTENT") },
})
mock.module(file("src/features/users/service.ts"), { namedExports: { allowedUserDomain: () => "nunoa.cl" } })

mock.module(file("src/features/summary/components/summary-view.tsx"), {
  namedExports: { SummaryView: () => createElement("div", null, "SUMMARY_CONTENT") },
})

test("navegación, estados vacíos y diálogos respetan ambos roles", async () => {
  const { AppSidebar } = await import("../src/components/layout/app-sidebar")
  const { AssociationsView } = await import("../src/features/neighborhood-associations/components/associations-view")
  const { StrategicActionsView } = await import("../src/features/strategic-actions/components/strategic-actions-view")
  const { TooltipProvider } = await import("../src/components/ui/tooltip")
  for (const current of ["user", "admin"]) {
    const render = (component: React.ComponentType) =>
      renderToStaticMarkup(
        createElement(
          PermissionsProvider,
          { role: current },
          createElement(TooltipProvider, null, createElement(component)),
        ),
      )
    const nav = render(() => createElement(AppSidebar, { viewerKey: `qa:${current}` }))
    assert.equal(nav.includes('href="/solicitudes"'), current === "admin")
    assert.equal(nav.includes('href="/eventos"'), current === "admin")
    assert.equal(nav.includes('href="/admin/usuarios"'), current === "admin")
    assert.equal(nav.includes('href="/admin/auditoria"'), current === "admin")
    assert.equal(nav.includes('href="/insumos"'), false)
    assert.equal(nav.includes('href="/juntas-vecinales"'), false)
    assert.ok(nav.includes('href="/catalogo"'))
    assert.equal(render(AssociationsView).includes("Nueva junta"), current === "admin")
    const strategic = render(StrategicActionsView)
    assert.equal(strategic.includes("Nueva acción"), current === "admin")
    assert.equal(strategic.includes("ADMIN_DIALOG"), current === "admin")
  }
})

test("barra móvil conserva destinos autorizados y omite Resumen", async () => {
  const { AppMobileNavigation } = await import("../src/components/layout/app-mobile-navigation")
  for (const current of ["admin", "regular", "unknown"]) {
    const html = renderToStaticMarkup(
      createElement(PermissionsProvider, { role: current }, createElement(AppMobileNavigation)),
    )
    assert.equal(html.includes('href="/solicitudes"'), current === "admin")
    assert.equal(html.includes('href="/resumen"'), false)
    assert.equal(html.includes('href="/plan/actividades"'), current !== "unknown")
    assert.equal(html.includes('href="/entregas"'), current !== "unknown")
  }
})

test("Catálogo conserva catálogos por rol y no consulta tipos de evento para usuarios normales", async () => {
  const { CatalogView } = await import("../src/features/catalog/components/catalog-view")
  const { default: Page } = await import("../src/app/(app)/catalogo/page")
  for (const current of ["user", "admin", "unknown"]) {
    role = current
    eventTypeReads = 0
    const html = renderToStaticMarkup(createElement(PermissionsProvider, { role: current }, await Page()))
    if (current === "unknown") {
      assert.ok(html.includes("Sin permisos"))
      assert.equal(eventTypeReads, 0)
      continue
    }
    assert.ok(html.includes('href="/insumos"'))
    assert.ok(html.includes('href="/juntas-vecinales"'))
    assert.equal(html.includes("Tipos de evento"), current === "admin")
    assert.equal(eventTypeReads, 0)
    assert.equal(html.includes('href="/tipos-evento"'), current === "admin")
  }
  role = null
  await assert.rejects(Page(), /redirect/)
  eventTypeReads = 0
  const closed = renderToStaticMarkup(
    createElement(PermissionsProvider, { role: "unknown" }, createElement(CatalogView)),
  )
  assert.equal(closed.includes('href="/insumos"'), false)
  assert.equal(closed.includes('href="/juntas-vecinales"'), false)
  assert.equal(eventTypeReads, 0)
})

test("Tipos de evento tiene una vista propia protegida y Configuración redirige a Catálogo", async () => {
  const { default: Page } = await import("../src/app/(app)/tipos-evento/page")
  for (const current of ["user", "admin", "unknown"]) {
    role = current
    eventTypeReads = 0
    const html = renderToStaticMarkup(createElement(PermissionsProvider, { role: current }, await Page()))
    assert.equal(html.includes("Sin permisos"), current !== "admin")
    assert.equal(eventTypeReads, current === "admin" ? 1 : 0)
    if (current === "admin") {
      assert.ok(html.includes("Tipos de evento"))
      assert.ok(html.includes("Catálogo"))
      assert.ok(html.includes("Buscar tipo de evento"))
      assert.equal(html.includes('href="/insumos"'), false)
    }
  }
  role = null
  await assert.rejects(Page(), /redirect/)
  const { default: LegacyPage } = await import("../src/app/(app)/admin/configuracion/page")
  assert.throws(LegacyPage, /redirect/)
})

test("acceso directo a solicitudes/eventos no monta contenido restringido", async () => {
  for (const modulePath of [
    "../src/app/(app)/solicitudes/page",
    "../src/app/(app)/eventos/page",
    "../src/app/(app)/eventos/[id]/page",
    "../src/app/(app)/admin/usuarios/page",
    "../src/app/(app)/admin/auditoria/page",
  ]) {
    const { default: Page } = await import(modulePath)
    for (const current of ["user", "admin"]) {
      role = current
      const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "event" }) }))
      assert.equal(html.includes("RESTRICTED_CONTENT"), current === "admin")
      assert.equal(html.includes("Sin permisos"), current === "user")
    }
    role = null
    await assert.rejects(Page({ params: Promise.resolve({ id: "event" }) }), /redirect/)
  }
})

test("listados poblados y detalles conservan consulta sin acciones administrativas", async () => {
  populated = true
  const { AssociationsView } = await import("../src/features/neighborhood-associations/components/associations-view")
  const { AssociationDetailView } =
    await import("../src/features/neighborhood-associations/components/association-detail-view")
  const { StrategicActionsView } = await import("../src/features/strategic-actions/components/strategic-actions-view")
  const { StrategicActionDetailView } =
    await import("../src/features/strategic-actions/components/strategic-action-detail-view")
  const { TooltipProvider } = await import("../src/components/ui/tooltip")
  for (const current of ["user", "admin"]) {
    const render = (node: React.ReactNode) =>
      renderToStaticMarkup(
        createElement(PermissionsProvider, { role: current }, createElement(TooltipProvider, null, node)),
      )
    const list = render(createElement(AssociationsView))
    assert.ok(list.includes("Junta de prueba"))
    assert.equal(list.includes("Editar junta"), current === "admin")
    assert.equal(list.includes("Eliminar junta"), current === "admin")
    const detail = render(createElement(AssociationDetailView, { id: "junta" }))
    assert.ok(detail.includes("Historial de entregas"))
    assert.equal(detail.includes("Eliminar junta"), current === "admin")
    const actions = render(createElement(StrategicActionsView))
    assert.ok(actions.includes("Acción de prueba"))
    assert.equal(actions.includes("Eliminar la acción"), current === "admin")
    const action = render(createElement(StrategicActionDetailView, { id: "accion" }))
    assert.equal(action.includes("Eliminar acción"), current === "admin")
    assert.equal(action.includes("ADMIN_DIALOG"), current === "admin")
  }
  populated = false
})

test("desglose de junta muestra cantidades con unidad, filtros y enlaces a entregas", async () => {
  const { AssociationDetailView } =
    await import("../src/features/neighborhood-associations/components/association-detail-view")
  const kg = { id: "kg", type: "Alimentos", unit: "kg" }
  const box = { id: "box", type: "Alimentos", unit: "caja" }
  association.availableSupplies = [kg, box]
  association.supplyBreakdown = [
    { ...kg, quantity: 5, deliveryCount: 1 },
    { ...box, quantity: 2, deliveryCount: 1 },
  ]
  association.totalsByUnit = [
    { unit: "kg", quantity: 5 },
    { unit: "caja", quantity: 2 },
  ]
  association.filteredDeliveryCount = 1
  association.deliveries = [
    {
      id: "entrega",
      folio: "ENT-2026-001",
      date: "2026-01-01",
      beneficiary: "Vecina de prueba",
      items: [
        { supply: kg, quantity: 5 },
        { supply: box, quantity: 2 },
      ],
    },
  ]
  const html = renderToStaticMarkup(
    createElement(PermissionsProvider, { role: "user" }, createElement(AssociationDetailView, { id: "junta" })),
  )
  assert.ok(html.includes("Desglose por insumo"))
  assert.ok(html.includes('type="date"'))
  assert.ok(html.includes("Todos los insumos"))
  assert.ok(html.includes("5 kg"))
  assert.ok(html.includes("2 caja"))
  assert.ok(html.includes('href="/entregas/entrega"'))
  assert.ok(html.includes("Vecina de prueba"))
  assert.ok(!html.includes("Unidades distribuidas"))
})

test("resumen disponible para ambos roles y protegido sin sesión o con rol desconocido", async () => {
  const { default: Page } = await import("../src/app/(app)/resumen/page")
  for (const current of ["user", "admin", "unknown"]) {
    role = current
    const html = renderToStaticMarkup(await Page())
    assert.equal(html.includes("SUMMARY_CONTENT"), current !== "unknown")
    assert.equal(html.includes("Sin permisos"), current === "unknown")
  }
  role = null
  await assert.rejects(Page(), /redirect/)
})
