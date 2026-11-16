# Estado y backlog del proyecto DGRD Ñuñoa

Actualizado el 16 de noviembre de 2026. Estado contrastado con `main` después del PR #43. La referencia funcional y visual es `spike/test-mockup`; no se usan otras ramas históricas para definir el producto. La revisión integral y los ajustes de navegación ya están integrados.

## Alcance vigente

- Manejo de archivos: evidencia de actividades, fotografías, informes y otros adjuntos siguen pendientes. Se aprobó mostrar controles desactivados en Entregas y Eventos, sin habilitar carga ni almacenamiento todavía.
- Visualización y georreferenciación quedan fuera del alcance, incluyendo gráficos/mapas adicionales del backlog original.
- No se implementarán importación ni mapeo de datos históricos.
- Identificación, alerta por RUT, búsqueda por campos, búsqueda global y auditoría ya están integradas.
- Se trabaja una feature por rama desde main, con revisión local antes de commit/PR. El usuario realiza el merge.

## Funcionalidades integradas

| IDs      | Funcionalidad            | Estado y referencia                                                                                                                                                   |
| -------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01      | Tipos de evento          | CRUD administrativo, nombres únicos normalizados y protección de tipos en uso. [Spec](./tipos-evento.md).                                                             |
| B02      | Eventos                  | CRUD, folios anuales persistentes, filtros, relaciones y advertencia de borrado sin eliminar solicitudes/entregas. [Spec](./eventos.md).                              |
| B03, B11 | Solicitudes e integridad | Descripción opcional; no se borran con entrega; Atendida requiere respuesta o entrega; folio persistente y sin cambio automático de estado. [Spec](./solicitudes.md). |
| B04      | Flujos contextuales      | Evento → solicitud, solicitud → evento y entregas desde ambos detalles. Se admite entrega directa al evento sin solicitud. Propagación transaccional de vínculos.     |
| B05, B07 | Actividades y cronograma | CRUD dentro del período de la acción, cronograma y agenda anual, sin archivos. [Spec](./actividades-cronograma.md).                                                   |
| B08      | Usuarios                 | Administración de cuentas, roles, estado, contraseña, sesiones y protección de administradores. [Spec](./usuarios.md).                                                |
| B09, B10 | Resumen y navegación     | Resumen anual según rol, inicio en /resumen, sidebar plegable y accesos por módulo. [Spec](./resumen.md).                                                             |
| B19      | Identificación           | RUT de beneficiario obligatorio y normalizado; junta opcional; históricos sin inferencias por nombre. [Spec](./entregas.md).                                          |
| B17      | Recurrencia              | Aviso informativo por al menos una entrega del mismo RUT en los últimos seis meses calendario, al registrar entrega; no bloquea.                                      |
| B18      | Antigua alerta por junta | Sustituida por la regla por RUT. No se implementa una alerta independiente por junta ni en solicitudes.                                                               |
| B20, B21 | Permisos                 | Guards en servidor y controles por rol, sin restricciones de autor dentro de módulos autorizados. [Spec](./permisos.md).                                              |
| B22      | Búsqueda en Entregas     | RUT parcial en caja general y campos independientes de beneficiario, RUT y evento, combinables con período/junta/insumo y estadísticas.                               |
| B23      | Búsqueda global          | Resultados por módulo con acceso al detalle y permisos de lectura; solicitudes/eventos solo administradores. [Spec](./busqueda-global.md).                            |
| B24, B25 | Desglose por junta       | Historial filtrable y cantidades por insumo/unidad; no mezcla unidades ni cuenta personas por nombre. [Spec](./juntas-vecinales.md).                                  |
| B34      | Auditoría                | Actor de sesión, valores antes/después, cambios derivados e historial administrativo conservado tras borrados. [Spec](./auditoria.md).                                |

El catálogo de insumos y sus historiales están implementados sin stock ni inventario. [Spec](./insumos.md).

## Pendientes y exclusiones

| IDs      | Estado                             | Alcance                                                                                                                     |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B06      | Pendiente por decisión             | Evidencia de actividades. El toggle sigue desactivado. Falta acordar almacenamiento, carga, consulta y borrado.             |
| B26, B27 | Pendiente por decisión             | Fotografías de entregas y almacenamiento, distintas de la evidencia de actividades.                                         |
| B28, B29 | Revisión base; archivos pendientes | Uso móvil sin archivos dentro de la revisión integral. Captura/carga de fotos no forma parte de esta etapa.                 |
| B12      | Fuera del alcance por decisión     | No se implementarán importación ni mapeo de planillas históricas. La migración del catálogo existente ya está implementada. |
| B13–B16  | Integrado en PR #41                | Revisión de flujos, permisos, escritorio/móvil, scripts reproducibles y documentación. [Informe](./revision-integral.md).   |
| B30, B31 | Fuera del alcance                  | Visualizaciones adicionales y gráficos. Se mantiene el resumen anual ya implementado.                                       |
| B32, B33 | Fuera del alcance                  | Georreferenciación, mapas y ubicaciones geográficas adicionales.                                                            |

Exportaciones, recordatorios e inventario fueron ideas por validar; no son requisitos aprobados ni funciones pendientes del spike. La importación de datos históricos está descartada.

## Ajustes de paridad integrados en PR #42

En `feat/navegacion-contadores` se implementan breadcrumbs navegables en detalles, contadores globales en la sidebar, topbar sticky con búsqueda centrada y cierre de sesión en el popover del usuario, eyebrows de sección y círculos de autor en registros de entrega/evento. Se unifican las acciones de tabla y el acceso por fila en juntas; el selector de solicitud en el formulario de entrega se oculta a usuarios normales. Ver [Navegación](./navegacion.md).

Se conserva la confirmación actual al eliminar usuarios, sin exigir escribir el correo, y la identidad actual de la barra superior. Son decisiones de producto, no pendientes de paridad.

## Nuevos cambios aprobados: dos entregas separadas

1. **Entregas**, integrado mediante PR #43: Observaciones opcionales persistidas y auditadas, controles de fotografías y archivos múltiples opcionales desactivados. Ver [Entregas](./entregas.md).
2. **Eventos**, en revisión en `feat/eventos-direccion-adjuntos`: cambiar Sector por Dirección conservando los valores existentes; agregar Informe ALFA (PDF), fotografías y archivos opcionales, todos desactivados hasta implementar el manejo de archivos.

Cada bloque se revisa antes de su commit/PR y el usuario realiza el merge. Ninguno incluye carga ni almacenamiento de archivos.

## Verificación reproducible

```bash
pnpm test
TEST_DATABASE_URL=... pnpm test:integration
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm build
```

`pnpm test` ejecuta unidades, contratos, permisos y rutas sin activar integraciones. Las integraciones exigen una URL explícita de una base separada y nunca toman la base operativa como fallback. Aplican las migraciones pendientes y habilitan las suites de integración de todos los módulos. El runner rechaza un destino que coincida con la base de .env.

## Reglas que no cambian

- Referencia exclusiva a main y spike; cada cambio se revisa antes del PR.
- Administrador gestiona los módulos actuales; usuario normal gestiona entregas, insumos y actividades de cualquier autor y consulta juntas/acciones/resumen/búsqueda permitida.
- No se hace merge automáticamente ni se aplican pruebas sobre la base operativa.
- No se reconstruye RUT, autoría ni auditoría histórica por coincidencias o suposiciones.
