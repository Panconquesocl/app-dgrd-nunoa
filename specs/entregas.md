# Entregas (tabla `delivery`)

Rama: `feat/entregas`. Módulo CRUD de entregas de insumos, con la UI del mockup de
`origin/spike/test-mockup` (`src/components/views/entregas.tsx`).

`strategic-actions` se usa **solo como referencia de estructura de código** (el patrón
que fija CLAUDE.md: `schemas` → `service` → rutas → `api`/`queries` → `components`). No
hay relación de dominio entre ambos: `StrategicAction` pertenece al Plan RRD
(acción → actividad → evidencia) y `Delivery` a Emergencias (solicitud → entrega →
ítems → insumo). No comparten ninguna clave foránea, solo `createdBy` hacia `User`.
Las reglas de negocio de acciones no se trasladan: el 409 por actividades vinculadas,
el número único por año y el filtro por año no tienen equivalente acá.

## Alcance de esta rama

Entrega como registro autónomo: datos del beneficiario, fecha, dirección y folio.
El listado parte con búsqueda y filtro por rango de fechas; el resto de los filtros
del mockup se suman después.

**Fuera de alcance (ramas aparte):**

- **Insumos** (`Supply` / `DeliveryItem`). Sin catálogo no hay repeater de insumos en
  el formulario ni columna de unidades en la tabla. La entrega se crea sin `items`.
- **Solicitudes** (`Request`) y su evento heredado. `requestId` y `eventId` quedan en
  `null`; el selector "Solicitud asociada" y el badge de evento del mockup no se
  implementan todavía.

## Decisiones tomadas

| Tema                  | Decisión                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folio                 | Lo genera el servidor. El usuario nunca lo escribe ni lo ve en el formulario.                                                                                                                           |
| Formato del folio     | `ENT-AAAA-NNN` (ej. `ENT-2026-001`), alineado con `SOL-2026-001` y `EV-2026-001` del spike.                                                                                                             |
| Correlativo del folio | Se reinicia cada año: `ENT-2026-137` → `ENT-2027-001`. El siguiente número se calcula solo entre los folios con el prefijo del año en curso. **Difiere del `nextFolio` del spike**, que no mira el año. |
| `contact`             | Opcional. Requiere migrar `Delivery.contact` de `String` a `String?`.                                                                                                                                   |
| Orden de trabajo      | Primero fechas y campos base; filtros avanzados y funciones extra después.                                                                                                                              |
| Base de la UI         | El mockup del spike, adaptado a los componentes shadcn que ya están en `src/components/ui/`.                                                                                                            |
| Insumos / solicitudes | Se difieren a otras ramas.                                                                                                                                                                              |

## Decisiones abiertas

- [ ] **Detalle.** Página propia `/entregas/[id]` (como acciones estratégicas) o drawer
      sobre el listado (como el mockup, requiere agregar `sheet` de shadcn). El mockup
      tenía ambos.

## Contrato previsto

```
GET    /api/deliveries        ?q&from&to        listado filtrable
POST   /api/deliveries                          alta (folio generado)
GET    /api/deliveries/:id                      detalle
PATCH  /api/deliveries/:id                      edición parcial
DELETE /api/deliveries/:id                      borrado
```

Las fechas cruzan como string ISO en ambos sentidos. `folio` viaja en los DTOs de
salida pero no en el payload de entrada.

## Plan por fases

- [ ] **F0 · migración** — `contact String?` en `prisma/schema.prisma`, migración
      `delivery_contact_optional` y `prisma generate`.
  - [x] `DIRECT_URL` para la CLI: `prisma.config.ts` usa `DIRECT_URL` y cae a
        `DATABASE_URL` si no está definida o viene vacía. Quien use Docker no define
        `DIRECT_URL` y no nota el cambio.
  - [x] `.env.example`: `DIRECT_URL` documentada y **comentada**, no vacía.
  - [ ] Revisar que `migration.sql` contenga solo el `DROP NOT NULL`.
- [ ] **F1 · `schemas.ts`** — zod de servidor (`createDeliverySchema`,
      `updateDeliverySchema` = `.partial()`, `listDeliveriesQuerySchema` con `q`, `from`,
      `to`), zod de formulario aparte (strings), DTOs de salida y `toDeliveryPayload()`.
- [ ] **F2 · `service.ts`** — `listDeliveries`, `getDelivery`, `createDelivery` (genera
      folio), `updateDelivery`, `deleteDelivery`. Errores vía `AppError`.
- [ ] **F3 · rutas** — `src/app/api/deliveries/route.ts` y `[id]/route.ts`, finas.
- [ ] **F4 · `api.ts` + `queries.ts`** — fetch tipado y hooks con claves jerárquicas.
- [ ] **F5 · componentes** — `deliveries-view.tsx` (tabla + búsqueda + rango de fechas +
      estados vacío/error/carga), `delivery-form-dialog.tsx`, `delete-delivery-dialog.tsx`.
- [ ] **F6 · páginas** — reemplazar el `ModulePlaceholder` de `src/app/(app)/entregas/page.tsx`
      y agregar el detalle.

### Después de esta rama

- [ ] Insumos: CRUD de `Supply` + repeater de `DeliveryItem` en el formulario.
- [ ] Solicitudes: selector de solicitud libre y herencia de `eventId`.
- [ ] Filtros avanzados del mockup: presets de periodo, con/sin evento, insumo incluido, orden.
- [ ] Stat row del listado (entregas, unidades distribuidas, juntas vecinales).

## Notas del modelo

- `folio` es `@unique` y `requestId` también: un `P2002` puede venir de cualquiera de los
  dos. Hay que leer `error.meta.target` antes de traducir el mensaje.
- `DeliveryItem` tiene `@@unique([deliveryId, supplyId])`: un ítem por insumo en cada
  entrega. Al editar, los ítems se reemplazan dentro de una transacción.
- `Delivery.request` es `onDelete: Cascade` y `Delivery.event` es `onDelete: SetNull`:
  borrar una entrega no toca ni la solicitud ni el evento.
- Entorno: el desarrollo de esta rama corre contra una base personal en Neon (vía
  pooler); el resto del equipo usa Docker (`postgres:17-alpine`). Las migraciones se
  corren por la conexión directa de Neon, porque Prisma Migrate no funciona a través
  de PgBouncer.
- Las fechas se guardan como medianoche UTC. Formatear con `formatDate()` de
  `src/lib/format.ts`; en la zona local de Chile se corren un día hacia atrás.

## Bitácora

- 2026-09-12 — Se levanta la spec. Backend y vistas de entregas todavía no existen en la rama.
- 2026-09-12 — Se decide `contact` opcional (con migración) y folio con año `ENT-AAAA-NNN`.
- 2026-09-12 — Se decide que el correlativo del folio se reinicia cada año.
- 2026-09-12 — Base personal en Neon, sin producción aún. Se agrega `DIRECT_URL` opcional
  para migrar sin romper el flujo de quienes usan Docker.
