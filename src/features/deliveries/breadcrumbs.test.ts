import assert from "node:assert/strict"
import { test } from "node:test"
import { deliveryBreadcrumbs } from "./breadcrumbs"
const event = { id: "evento", folio: "EV-2026-001", address: "Dirección de prueba", type: { name: "Incendio" } }
const request = { id: "solicitud", folio: "SOL-2026-001", channel: "Teléfono" }
const delivery = { folio: "ENT-2026-001", event, request }
const admin = { events: true, requests: true }

test("breadcrumb de entrega prioriza evento, luego solicitud y después ruta general", () => {
  assert.deepEqual(
    deliveryBreadcrumbs(delivery, admin).map((c) => c.label),
    ["Emergencias", "Eventos", event.folio, delivery.folio],
  )
  assert.equal(deliveryBreadcrumbs(delivery, admin)[2].href, "/eventos/evento")
  assert.equal(deliveryBreadcrumbs({ ...delivery, event: null }, admin)[2].href, "/solicitudes/solicitud")
  const standalone = deliveryBreadcrumbs({ ...delivery, event: null, request: null }, admin)
  assert.equal(standalone[1].href, "/entregas")
  assert.deepEqual(standalone.at(-1), { label: delivery.folio, current: true })
})
test("sin permiso no incluye folios ni destinos restringidos; carga usa ruta general", () => {
  const regular = deliveryBreadcrumbs(delivery, { events: false, requests: false })
  assert.deepEqual(
    regular.map((c) => c.label),
    ["Ayudas primera respuesta", "Entregas", delivery.folio],
  )
  assert.deepEqual(
    regular.filter((c) => c.href).map((c) => c.href),
    ["/entregas"],
  )
  assert.equal(deliveryBreadcrumbs(undefined, admin).at(-1)?.label, "Entrega")
})
