# Gestión de eventos

Implementada desde main, con referencia funcional y visual exclusiva al spike. Solo administradores acceden a `/eventos`, `/eventos/[id]` y a las rutas `/api/events`.

## Entregas desde el detalle

La página y el panel lateral incluyen «Registrar entrega» según permisos. El formulario conserva el evento de origen, precarga su fecha (editable) y no preselecciona ninguna solicitud. Se puede guardar sin solicitud. El selector solo incluye solicitudes de ese evento sin entrega asociada, sin toggle ni preselección. El servidor rechaza solicitudes que hayan cambiado de evento o tengan otra entrega.

Como en el spike, el detalle muestra estadísticas de personas afectadas, entregas, unidades de insumo entregadas y solicitudes asociadas. Incluye las entregas directas y las vinculadas mediante solicitudes. Guardar refresca las relaciones y estadísticas antes de cerrar el formulario; cancelar mantiene abierto el detalle. El borrado de eventos incluye las entregas directas en la advertencia y conserva los registros sin vínculo al evento.

## Reglas y relaciones

- Tipo, fecha calendario y dirección obligatorios. Personas afectadas opcional, entero no negativo hasta el límite de PostgreSQL. Instituciones y acciones opcionales.
- Folios `EV-AAAA-NNN` con año de America/Santiago y contador anual persistente. La reserva se confirma en la misma transacción que el evento. El borrado no libera números.
- Cambiar el tipo, fecha o dirección conserva solicitudes y entregas relacionadas.
- Eliminar conserva solicitudes, entregas e ítems y deja sus eventId en null (FK SetNull existente).
- Antes del borrado se muestra una advertencia con el número de solicitudes y entregas asociadas. El servidor exige los ids de las asociaciones que el usuario confirmó. Si cambian, responde 409 y el diálogo recarga la advertencia; requiere una nueva confirmación. No hay borrado sin confirmación de impacto, incluso cuando las listas están vacías.
- Desde un evento se crea una solicitud con su evento precargado; el usuario puede cambiar la selección antes de guardar.
- Desde una solicitud sin evento se crea y asocia un evento en una única transacción. La entrega de la solicitud hereda el evento; si la solicitud desapareció o adquirió otro evento, el alta se rechaza. Las acciones se precargan con su respuesta y pueden editarse.
- Registrar un evento no cambia estados de solicitudes. Se conservan las reglas de atención acordadas en Solicitudes.

## Interfaz

Listado con búsqueda por folio/tipo/dirección y filtros por tipo y fechas, conteos de solicitudes y entregas, diálogos de alta/edición y detalle lateral. Ruta propia para abrir el detalle por enlace. El detalle muestra información, entregas, solicitudes y autor. Los datos y contadores relacionados se invalidan tras las mutaciones de eventos, solicitudes, entregas y tipos.

El formulario mantiene encabezado y botones visibles; solo los campos se desplazan. El detalle se ancla a la derecha usando `placement="right"`.

### Dirección y controles de adjuntos

En revisión en `feat/eventos-direccion-adjuntos`, pendiente de integración:

- Dirección reemplaza Sector en el formulario, listado, detalle, búsquedas, resumen y selectores relacionados de Solicitudes y Entregas. Es obligatoria, se normalizan espacios exteriores y admite hasta 500 caracteres.
- El contrato de eventos y sus relaciones usa `address`; `sector` deja de ser el campo editable de la API.
- Informe ALFA es un control opcional de un solo PDF (`.pdf,application/pdf`). Fotografías (`image/*`) y Archivos permiten selección múltiple. Los tres controles están desactivados en alta y edición; no se registran en el formulario ni se envían archivos o metadatos.
- Se mantiene la navegación y el scroll del formulario; los adjuntos quedan dentro del área desplazable y los botones permanecen visibles.

## API

- GET/POST `/api/events`: listado y alta; alta acepta requestId opcional para asociación contextual.
- GET/PATCH `/api/events/[id]`: detalle y actualización completa de los campos editables.
- GET `/api/events/[id]/deletion-impact`: asociaciones actuales, protegido por permiso de borrado.
- DELETE `/api/events/[id]`: cuerpo `{ requestIds: string[], deliveryIds: string[] }` con las asociaciones revisadas.

## Migración

`20261115200000_event_folio_counter` crea el contador e inicializa los máximos existentes por año. Los folios legados no correlativos se ignoran; no se reconstruyen folios borrados antes de migrar. No modifica los eventos ni sus relaciones existentes.

Aplicar en el entorno de revisión con `pnpm exec prisma migrate deploy` y regenerar cliente con `pnpm exec prisma generate`. Las altas mantienen el contador persistente.

`20261116080000_event_address` renombra la columna `event.sector` a `event.address` sin borrar ni reinterpretar su contenido, y actualiza el trigger de auditoría para las operaciones nuevas. Conserva ids, folios, fechas, solicitudes, entregas y auditoría previa. Los JSON antiguos mantienen `sector`, que se presenta como «Sector (anterior)»; los cambios nuevos usan `address`, presentado como «Dirección». No se actualizan migraciones ya aplicadas.

Esta versión requiere aplicar la migración y regenerar Prisma antes de ejecutarse; el nombre de columna y el contrato de la versión anterior eran `sector`. No se crean tablas ni endpoints para adjuntos.

## Verificación

Pruebas de validaciones (fecha, cantidades, opcionales), folios concurrentes y persistentes, altas contextuales, rechazo de reasociación, sincronización de entrega, cambio de asociaciones después de advertir y conservación de registros/ítems al borrar. Permisos en rutas antes de parsear o consultar y páginas restringidas.

Integración: `RUN_EVENTS_INTEGRATION=1 node --import tsx --test src/features/events/service.integration.test.ts`, únicamente con DATABASE_URL de una base temporal aislada.

Revisión manual: crear un tipo en Configuración; crear y editar eventos; probar filtros y apertura lateral; crear una solicitud desde evento; crear evento desde solicitud sin evento (con y sin entrega); comprobar la advertencia de borrado y que los registros relacionados permanezcan. Repetir formularios y panel en móvil. La revisión integral integrada está documentada en [Revisión integral](./revision-integral.md).

Verificación de Dirección y adjuntos: 64 pruebas generales aprobadas. Las 21 pruebas de integración se verificaron en PostgreSQL aislado; la integración de Entregas se repitió tras actualizar la expectativa del selector al nuevo nombre. La migración se probó también sobre un esquema anterior con valores, vínculos y auditoría existentes, comprobando que se conservan. Build habitual con Turbopack, TypeScript, ESLint y formato correctos.

En navegador se verificaron alta/edición, validación de dirección obligatoria, panel lateral, búsqueda por dirección, resumen, creación de solicitud desde evento y datos relacionados de entregas. Se comprobaron permisos y la ausencia de archivos en el payload. Los tres controles se revisaron a 1440×900, 390×844, 320×640 y 390×500: adjuntos accesibles por scroll, botones fijos, sin desbordamiento de página ni errores de JavaScript. La publicación del PR se realiza a solicitud del usuario; el merge queda a su cargo.
