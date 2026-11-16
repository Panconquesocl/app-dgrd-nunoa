# Entregas (tabla `delivery`)

Rama: `feat/entregas`. Implementación del módulo de entregas de
el spike (tag `archive/spike-test-mockup`), adaptado al patrón de features de esta rama:
`schemas` → `service` → rutas REST → `api`/`queries` → `components`.

## Alcance y decisiones

Decisiones confirmadas el 2026-10-14:

- Reproducir la distribución y el estilo visual del spike con los tokens existentes.
- Abrir el detalle en un drawer desde la tabla y ofrecer una página `/entregas/[id]`.
- Usar solicitudes e insumos existentes en la base mediante selectores. El catálogo
  de insumos también se implementó en esta rama (ver `insumos.md`). Los CRUD de
  solicitudes y eventos siguen fuera de alcance; sus tarjetas muestran los datos
  sin enlaces a páginas de detalle todavía inexistentes.
- Conservar el folio anual `ENT-AAAA-NNN` (ej. `ENT-2026-001`), generado por el
  servidor. El año corresponde a la fecha de registro en `America/Santiago`, no
  a la fecha de entrega introducida. El correlativo usa el mayor sufijo numérico
  del año, no el número de filas ni el orden lexicográfico. Las altas del mismo
  año se serializan con un bloqueo transaccional de PostgreSQL. Como no existe
  una tabla de secuencias persistente, borrar el último folio permite reutilizar
  ese correlativo en el siguiente alta.
- RUT del beneficiario obligatorio al crear o editar, validado con módulo 11 y normalizado sin puntos, con guion y dígito verificador en mayúscula. Se admiten varias entregas para el mismo RUT. Los históricos sin RUT se conservan, pero deben completarlo al editar.
- Contacto opcional: vacío se normaliza a `null`.
- Junta vecinal opcional desde el catálogo, con filtro por identificador.
  Las nuevas entregas solo admiten juntas activas; el historial conserva las inactivas.
- Requerir al menos un insumo, cantidades enteras positivas y no repetir insumos.
- Asociación opcional a una solicitud; máximo una entrega por solicitud.
  Con solicitud, `eventId` se hereda de ella. Sin solicitud, se admite un evento directo desde su detalle.

La versión anterior de esta spec difería insumos, relaciones y filtros avanzados.
El alcance se amplió para incorporar esas funciones del spike.

## Funcionalidad implementada

- Alta contextual desde eventos: fecha del evento editable, ninguna solicitud preseleccionada y asociación al evento incluso sin solicitud. El selector incluye únicamente solicitudes de ese evento sin entrega asociada, sin preselección ni toggle. Guardar refresca el detalle; cancelar conserva la página o panel de origen.
- Alta contextual desde el detalle de una solicitud sin entrega: solicitud fija, evento heredado y datos del beneficiario e insumos sin precargar. Al guardar se actualizan solicitudes, eventos y listados antes de cerrar el formulario; cancelar conserva la página o panel de origen. No se cambia automáticamente el estado de la solicitud.
- Listado con búsqueda por folio, beneficiario, junta vecinal, dirección y folio del evento.
- Rango de fechas inclusivo y periodos rápidos: este mes, 30 días y este año.
- Filtros con/sin evento, insumo incluido y orden por fecha.
- Indicadores calculados sobre los resultados filtrados: entregas, unidades y juntas vecinales.
- Formulario de alta y edición: fecha, junta vecinal opcional del catálogo, beneficiario, RUT obligatorio, contacto,
  dirección y solicitud opcional. Folio generado fuera del formulario.
- Filas dinámicas de insumos: tipo, unidad y cantidad. Si un tipo tiene una sola
  unidad, se selecciona automáticamente; las variantes ocupadas se deshabilitan.
- Detalle en drawer y página, con insumos, relaciones, autor y fecha de registro.
- Edición desde la tabla o detalle; borrado con confirmación.
- Estados de carga, error con reintento, catálogo vacío y listado vacío/con filtros.

## Contrato

```text
GET    /api/deliveries        ?q&beneficiary&beneficiaryRut&eventId&from&to&event=all|with|without&supplyId&order=asc|desc
POST   /api/deliveries
GET    /api/deliveries/options
GET    /api/deliveries/:id
PATCH  /api/deliveries/:id
DELETE /api/deliveries/:id
```

Entrada: `beneficiary`, `beneficiaryRut`, `neighborhoodAssociationId` opcional/nullable, `contact`, `address`, `date` (`AAAA-MM-DD`),
`requestId` y `eventId` opcionales y nullable, e `items: [{ supplyId, quantity }]`.
Los PATCH son parciales. Si incluyen `items`, reemplazan el conjunto completo
atómicamente. Con solicitud, el evento se deriva de ella y se rechaza un `eventId` explícito distinto. Sin solicitud, el evento explícito se valida y bloquea con `FOR SHARE` contra borrado concurrente. Un PATCH que omite relaciones las conserva; editar una entrega directa con `requestId: null` conserva su evento. Desvincular una solicitud quita su evento heredado salvo que se envíe un evento explícito. `eventId: null` permite quitar el vínculo de una entrega sin solicitud. No se cambia automáticamente el estado de las solicitudes.
Las fechas de salida son strings ISO; se guardan como medianoche UTC y se muestran
con `formatDate()`. Los identificadores del dominio son CUID.

El servicio valida que existan los insumos y que la solicitud exista y esté libre.
Los índices únicos y claves foráneas mantienen las restricciones ante carreras.
Los errores se traducen mediante `AppError`, con `fieldErrors` cuando corresponde.
El borrado de una entrega elimina sus ítems, sin eliminar solicitud, evento o catálogo.

## Base de datos

- `contact String?` y migración `delivery_contact_optional`.
- Prisma CLI usa `DIRECT_URL`, con fallback a `DATABASE_URL`.
- El catálogo de juntas y la sustitución de `jv` por una FK obligatoria están en
  `20261015000000_neighborhood_associations`; ver `juntas-vecinales.md`.
- `Delivery.request` conserva `onDelete: Cascade`; borrar una solicitud borra su entrega.
- `Delivery.event` conserva `onDelete: SetNull`.

## Validación

```bash
pnpm test:deliveries
# Incluye la integración contra la DB de desarrollo configurada en .env.
# Crea fixtures aislados y los elimina al terminar.
RUN_DELIVERY_INTEGRATION=1 pnpm test:deliveries
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las pruebas cubren normalización, fechas imposibles, cantidades, duplicados,
PATCH parcial, filtros, conversión de formulario, folios, CRUD real,
herencia del evento, sustitución de ítems y altas concurrentes.

## Integraciones para otras ramas

- CRUD de solicitudes y eventos. El CRUD de insumos ya está implementado.
- Crear entregas desde las páginas de solicitud y evento, con contexto precargado.
- Mostrar entregas en los detalles de solicitudes y eventos y en el resumen.
  El historial por insumo ya está implementado.
- Al cambiar el evento de una solicitud, sincronizar `Delivery.eventId` en la misma
  transacción, como hace el spike. Es responsabilidad del futuro módulo de solicitudes.

## Identificación del beneficiario

`20261116020000_delivery_beneficiary_rut` agrega `beneficiaryRut` nullable para conservar los históricos y permite `neighborhoodAssociationId: null`. No inventa RUT ni modifica vínculos existentes. El índice no único `(beneficiaryRut, date)` permite consultar entregas anteriores sin impedir nuevas entregas. Aplicar con `pnpm exec prisma migrate deploy` y regenerar el cliente con `pnpm exec prisma generate`.

Formulario, tabla y detalle muestran el RUT; los históricos indican «Sin RUT registrado». Sin junta se muestra «Sin junta vecinal», también en el resumen, y no se contabiliza una junta adicional en estadísticas. Una junta seleccionada mantiene las validaciones de existencia/actividad y la protección de borrado. El servidor exige un RUT válido en altas y al editar una entrega histórica sin RUT.

## Alerta informativa por RUT

Al registrar una entrega se consulta si existe al menos una entrega anterior del mismo RUT normalizado, sin distinguir nombre, junta, evento o insumos. La ventana considera las fechas de entrega desde hace seis meses calendario hasta hoy en America/Santiago, incluyendo ambos días; se excluyen fechas futuras. Si el mes de inicio no tiene ese día, se usa su último día. La fecha de la nueva entrega no mueve esta ventana.

El formulario consulta al completar un RUT válido y muestra un popover con el número de entregas y la última fecha, anclado a un icono dentro del campo RUT. Se abre sin quitar el foco del campo, se puede cerrar y volver a abrir, y no desplaza los demás inputs. No muestra datos de otro RUT mientras se escribe. Al enviar se consulta nuevamente y se muestra el aviso antes de continuar con el alta, sin pedir confirmación adicional ni bloquear por recurrencia. Si la consulta falla o supera cinco segundos, se informa y se intenta registrar igualmente. La consulta inicial es informativa; no constituye una reserva frente a nuevas entregas simultáneas. No se implementan alertas al editar ni en solicitudes.

GET `/api/deliveries/recurrence?rut=...` exige permiso `deliveries:create`, valida/normaliza RUT y responde `{ count, from, through, lastDate }` sin caché HTTP. Los históricos sin RUT no se atribuyen por nombre. Crear, editar o eliminar entregas invalida las consultas de recurrencia. Se utiliza el índice existente `(beneficiaryRut, date)`, sin nueva migración.

Verificación: límites inclusivos y meses bisiestos, día de Chile frente a UTC, formatos de RUT, exclusión de otras identidades/históricos/futuros y registro permitido con recurrencia; permisos y validación de la ruta.

## Búsqueda y filtros independientes

La caja general busca por folio, beneficiario, dirección, junta (nombre o número), folio de evento y RUT completo o parcial. Para RUT se ignoran puntos, guion, espacios y mayúsculas del verificador; también se reconocen fragmentos que atraviesan el guion (por ejemplo, «6785» o «678-5» en «12.345.678-5»). No se exige un dígito verificador válido al buscar fragmentos. No se infieren identidades por nombres coincidentes.

El popover de filtros mantiene el estilo existente e incorpora beneficiario (nombre parcial), RUT (completo o parcial) y evento (selector por folio y sector). Los tres se combinan con búsqueda general, fechas, junta, insumo y con/sin evento mediante AND. Una combinación contradictoria devuelve cero resultados y estadísticas en cero. La búsqueda general combina sus campos con OR. El servidor aplica los filtros y calcula estadísticas sobre el mismo resultado.

Las opciones de evento incluyen únicamente id, folio y sector de eventos con entregas, también cuando la entrega no tiene solicitud; usuarios normales usan los permisos de lectura de entregas sin acceder al módulo administrativo de eventos. Las opciones no dependen de la búsqueda actual, de modo que un resultado vacío no impide cambiar de evento.

Los campos de texto consultan con el debounce existente; el botón de filtros cuenta los filtros avanzados activos. «Limpiar todo», disponible en la toolbar y el popover, restablece búsqueda, periodo, campos independientes, selecciones y orden. El menú conserva desplazamiento limitado al espacio disponible en móvil. No hay nueva migración. La búsqueda global se implementará en otra rama tras revisar esta feature.
