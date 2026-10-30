import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PermissionsProvider } from "../src/providers/permissions"

const file = (path: string) => pathToFileURL(resolve(path)).href
mock.module(file("src/features/deliveries/components/deliveries.css"), { namedExports: {} })
let role: string | null = "user"
let populated = false
const association = {
  id: "junta",
  number: 1,
  name: "Junta de prueba",
  active: true,
  _count: { deliveries: 0 },
  totalUnits: 0,
  deliveries: [],
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
    const nav = render(AppSidebar)
    assert.equal(nav.includes('href="/solicitudes"'), current === "admin")
    assert.equal(nav.includes('href="/eventos"'), current === "admin")
    assert.ok(nav.includes('href="/juntas-vecinales"'))
    assert.equal(render(AssociationsView).includes("Nueva junta"), current === "admin")
    const strategic = render(StrategicActionsView)
    assert.equal(strategic.includes("Nueva acción"), current === "admin")
    assert.equal(strategic.includes("ADMIN_DIALOG"), current === "admin")
  }
})

test("acceso directo a solicitudes/eventos no monta contenido restringido", async () => {
  for (const modulePath of ["../src/app/(app)/solicitudes/page", "../src/app/(app)/eventos/page"]) {
    const { default: Page } = await import(modulePath)
    for (const current of ["user", "admin"]) {
      role = current
      const html = renderToStaticMarkup(await Page())
      assert.equal(html.includes("RESTRICTED_CONTENT"), current === "admin")
      assert.equal(html.includes("Sin permisos"), current === "user")
    }
    role = null
    await assert.rejects(Page(), /redirect/)
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
