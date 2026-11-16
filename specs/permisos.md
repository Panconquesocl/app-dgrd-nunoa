# Permisos por rol

Implementación de B20–B21 en `feat/permisos-por-rol`.

## Matriz acordada

| Recurso                                  | Usuario normal                                                                             | Administrador                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| Entregas e insumos                       | Consultar, crear, editar y eliminar registros de cualquier autor                           | Gestión completa              |
| Juntas vecinales y acciones estratégicas | Consultar listados, detalles e historiales                                                 | Gestión completa              |
| Solicitudes y eventos                    | Sin acceso al módulo; datos mínimos relacionados desde entregas, sin selector de solicitud | Acceso completo               |
| Búsqueda global                          | Consultar entregas, juntas, insumos, acciones y actividades                                | Incluye solicitudes y eventos |
| Resumen actual                           | Consultar entregas, insumos, acciones y actividades del año                                | Acceso completo               |
| Actividades y evidencia                  | Actividades: CRUD de cualquier autor; evidencia pendiente                                  | Gestión completa              |
| Usuarios y tipos de evento               | Sin administración                                                                         | Gestión completa              |

La auditoría (`audit:read`) es exclusiva de administradores. La página `/admin/auditoria` y sus rutas GET aplican guard propio; no se exponen operaciones de edición o borrado del historial. Los servicios de escritura reciben la identidad de sesión para registrar quién realizó cada cambio, incluyendo los de registros ajenos. Ver [Auditoría](./auditoria.md).

Las restricciones actuales de integridad y las confirmaciones de eliminación se
mantienen para ambos roles. Administrar todo no permite ignorar estas reglas.
El borrado de solicitudes con entrega vinculada está bloqueado, incluso para administradores.

## Política y puntos de entrada

`src/lib/permissions.ts` contiene `Resource`, `Action`, `normalizeRole` y
`can(role, resource, action)`. Se admite `admin` como administrador. `user`,
`regular`, `null`, `undefined` o cadena vacía tienen permisos normales para
compatibilidad con los registros existentes; otros valores se deniegan.
No se introducen roles personalizados ni se cambia el esquema o los datos.

Cada handler REST de dominio debe empezar por
`requirePermission(resource, action)` desde `src/lib/session.ts`. El guard usa
la sesión validada por Better Auth; no acepta un rol enviado por el cliente.
Se comprueba antes de leer cuerpos, parámetros o invocar los servicios.
Sin sesión devuelve 401; sin permiso devuelve 403. Ambos usan `{ message }`.
Los servicios conservan reglas de negocio y no filtran por autor.

La política define cuatro acciones: `read`, `create`, `update`, `delete`.
En los catálogos restringidos, actualizar incluye activar/desactivar.
Los DTO, URLs, asociaciones a solicitudes y reglas de integridad no cambian.
El endpoint de opciones de entregas y su DTO actual siguen disponibles a ambos
roles; no habilitan navegar a ni modificar Solicitudes o Eventos.

Las páginas de Solicitudes y Eventos comprueban el rol en servidor y muestran
“Sin permisos” con un enlace a Entregas si el usuario no está autorizado.
Un usuario sin sesión se redirige al login. Esta vista no cambia el estado HTTP
de la página a 403; los endpoints REST sí responden con ese código.

## Interfaz

El layout autenticado transmite el rol normalizado a `PermissionsProvider`.
`usePermission(resource, action)` aplica la misma política para mostrar controles.
Fuera del provider se deniega por defecto.

Los usuarios normales no ven Solicitudes/Eventos en el menú ni controles de
creación, edición, borrado o activación de juntas y acciones, incluidos los estados
vacíos. Sus formularios y diálogos de gestión no se montan. Los enlaces de consulta
y los historiales continúan disponibles.

En el formulario de entrega, el selector de solicitud y sus ayudas aparecen solo con permiso de lectura de Solicitudes (administrador). Para usuarios normales se oculta en alta y edición; el formulario omite `requestId` al guardar, conservando cualquier vínculo ya existente. No se modifican los permisos ni contratos actuales de la API de entregas.

El rol de la interfaz corresponde al render del layout; el servidor vuelve a
validarlo en cada petición. Si se retira el rol administrador con una pantalla
abierta, la siguiente mutación restringida falla con 403 y los formularios usan
el manejo de errores existente. Una recarga actualiza los controles.

## Verificación

```bash
pnpm test:permissions
pnpm test:deliveries
pnpm test:supplies
pnpm test:associations
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las pruebas de permisos usan el runner de Node y mocks de módulos experimentales
para ejecutar los handlers reales sin acceder a una base de datos. Cubren la
matriz completa, 401/403 antes de procesar datos, lecturas y escrituras permitidas,
registros de otros autores, opciones de entregas y cambio de rol entre peticiones.
También verifican el HTML renderizado por ambos roles y el acceso directo a las
páginas restringidas. No sustituyen la validación en navegador ni las integraciones
PostgreSQL de cada módulo, que requieren sus flags de activación existentes.

### Resultado histórico de B20–B21

- Ocho pruebas de permisos aprobadas, incluidas APIs reales con servicios
  simulados, sesión y renderizado de interfaz para ambos roles.
- Quince pruebas unitarias existentes aprobadas; cuatro integraciones PostgreSQL
  omitidas, sin activar sus flags.
- Lint, TypeScript, formato y `git diff --check` aprobados.
- Build de producción aprobado con `pnpm exec next build --webpack`. El build
  habitual con Turbopack quedó sin avanzar y se interrumpió. Webpack requirió
  acceso a red para descargar las fuentes de Google utilizadas por el proyecto.
- Las copias duplicadas de tipos generados `* 3.ts` en `.next/types` se
  preservaron fuera de `.next` para resolver el conflicto local previo de tipos;
  no se modificaron archivos versionados para esta corrección.
- En esa etapa quedó pendiente la comprobación en navegador; posteriormente se verificaron ambos roles en la revisión integral del PR #41.

## Estado actual tras la revisión integral

- Los guards ya protegen Solicitudes, Eventos, Actividades y administración. Evidencia sigue pospuesta, sin API de archivos implementada.
- La auditoría B34 ya está integrada y restringida a administradores. Ver [Auditoría](./auditoria.md).
- El resumen anual excluye solicitudes y eventos para usuarios normales, incluidas cifras y años disponibles. Ver [Resumen](./resumen.md).
- La administración de cuentas y la sidebar plegable ya están integradas. La revisión integral incluyó accesos por rol y anchos móviles; el bloque de validación anterior es evidencia histórica de B20–B21. Ver [Revisión integral](./revision-integral.md).
- Los breadcrumbs y contadores de navegación respetan los permisos del módulo; no exponen enlaces ni totales de Solicitudes/Eventos a usuarios normales. Ver [Navegación](./navegacion.md).

## Búsqueda global

`search:read` está permitido para usuarios normales y administradores. GET `/api/search` autoriza antes de validar y usa el rol de la sesión. El servicio comprueba además la lectura de cada módulo antes de ejecutar su consulta; los módulos restringidos se omiten por completo de la respuesta. No se buscan cuentas de usuario ni tipos de evento como recursos independientes. No hay endpoints de escritura de búsqueda. Ver [Búsqueda global](./busqueda-global.md).
