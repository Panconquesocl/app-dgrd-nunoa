# Gestión de eventos

Implementada desde main, con referencia funcional y visual exclusiva al spike. Solo administradores acceden a `/eventos`, `/eventos/[id]` y a las rutas `/api/events`.

## Reglas y relaciones

- Tipo, fecha calendario y sector obligatorios. Personas afectadas opcional, entero no negativo hasta el límite de PostgreSQL. Instituciones y acciones opcionales.
- Folios `EV-AAAA-NNN` con año de America/Santiago y contador anual persistente. La reserva se confirma en la misma transacción que el evento. El borrado no libera números.
- Cambiar el tipo, fecha o sector conserva solicitudes y entregas relacionadas.
- Eliminar conserva solicitudes, entregas e ítems y deja sus eventId en null (FK SetNull existente).
- Antes del borrado se muestra una advertencia con el número de solicitudes y entregas asociadas. El servidor exige los ids de las asociaciones que el usuario confirmó. Si cambian, responde 409 y el diálogo recarga la advertencia; requiere una nueva confirmación. No hay borrado sin confirmación de impacto, incluso cuando las listas están vacías.
- Desde un evento se crea una solicitud con su evento precargado; el usuario puede cambiar la selección antes de guardar.
- Desde una solicitud sin evento se crea y asocia un evento en una única transacción. La entrega de la solicitud hereda el evento; si la solicitud desapareció o adquirió otro evento, el alta se rechaza. Las acciones se precargan con su respuesta y pueden editarse.
- Registrar un evento no cambia estados de solicitudes. Se conservan las reglas de atención acordadas en Solicitudes.

## Interfaz

Listado con búsqueda por folio/tipo/sector y filtros por tipo y fechas, conteos de solicitudes y entregas, diálogos de alta/edición y detalle lateral. Ruta propia para abrir el detalle por enlace. El detalle muestra información, entregas, solicitudes y autor. Los datos y contadores relacionados se invalidan tras las mutaciones de eventos, solicitudes, entregas y tipos.

El formulario mantiene encabezado y botones visibles; solo los campos se desplazan. El detalle se ancla a la derecha usando `placement="right"`.

## API

- GET/POST `/api/events`: listado y alta; alta acepta requestId opcional para asociación contextual.
- GET/PATCH `/api/events/[id]`: detalle y actualización completa de los campos editables.
- GET `/api/events/[id]/deletion-impact`: asociaciones actuales, protegido por permiso de borrado.
- DELETE `/api/events/[id]`: cuerpo `{ requestIds: string[], deliveryIds: string[] }` con las asociaciones revisadas.

## Migración

`20261115200000_event_folio_counter` crea el contador e inicializa los máximos existentes por año. Los folios legados no correlativos se ignoran; no se reconstruyen folios borrados antes de migrar. No modifica los eventos ni sus relaciones existentes.

Aplicar en el entorno de revisión con `pnpm exec prisma migrate deploy` y regenerar cliente con `pnpm exec prisma generate`. Las importaciones futuras deben mantener también el contador.

## Verificación

Pruebas de validaciones (fecha, cantidades, opcionales), folios concurrentes y persistentes, altas contextuales, rechazo de reasociación, sincronización de entrega, cambio de asociaciones después de advertir y conservación de registros/ítems al borrar. Permisos en rutas antes de parsear o consultar y páginas restringidas.

Integración: `RUN_EVENTS_INTEGRATION=1 node --import tsx --test src/features/events/service.integration.test.ts`, únicamente con DATABASE_URL de una base temporal aislada.

Revisión manual: crear un tipo en Configuración; crear y editar eventos; probar filtros y apertura lateral; crear una solicitud desde evento; crear evento desde solicitud sin evento (con y sin entrega); comprobar la advertencia de borrado y que los registros relacionados permanezcan. Repetir formularios y panel en móvil. Pendiente revisión visual del usuario antes de commit/PR.
