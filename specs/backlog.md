# Estado y backlog del proyecto DGRD Ñuñoa

Actualizado el 17 de noviembre de 2026. Estado de `main` después de los PR #45 (archivos R2) y #46 (build), con carga directa R2 en revisión local. La referencia funcional y visual es `spike/test-mockup`; no se usan otras ramas históricas para definir el producto. La revisión integral y los ajustes de navegación ya están integrados.

## Alcance vigente

- Manejo de archivos integrado mediante PR #45: bucket privado Cloudflare R2, 25 MB por archivo, hasta 20 por grupo, ALFA único PDF, permisos, previsualización y borrado asociado con advertencia. [Spec](./archivos-r2.md).
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
| B05, B07 | Actividades y cronograma | CRUD dentro del período de la acción, cronograma y agenda anual. Evidencia R2 integrada. [Spec](./actividades-cronograma.md).                                         |
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

| IDs      | Estado                         | Alcance                                                                                                                     |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| B06      | Integrado en PR #45            | Evidencia de actividades activa con almacenamiento privado R2. [Spec](./archivos-r2.md).                                    |
| B26, B27 | Integrado en PR #45            | Fotografías y archivos de entregas/eventos en R2, con permisos y borrado fiable.                                            |
| B28, B29 | Integrado en PR #45            | Carga desde selector de archivos del dispositivo y formularios con scroll en móvil.                                         |
| B12      | Fuera del alcance por decisión | No se implementarán importación ni mapeo de planillas históricas. La migración del catálogo existente ya está implementada. |
| B13–B16  | Integrado en PR #41            | Revisión de flujos, permisos, escritorio/móvil, scripts reproducibles y documentación. [Informe](./revision-integral.md).   |
| B30, B31 | Fuera del alcance              | Visualizaciones adicionales y gráficos. Se mantiene el resumen anual ya implementado.                                       |
| B32, B33 | Fuera del alcance              | Georreferenciación, mapas y ubicaciones geográficas adicionales.                                                            |

Exportaciones, recordatorios e inventario fueron ideas por validar; no son requisitos aprobados ni funciones pendientes del spike. La importación de datos históricos está descartada.

## Ajustes de paridad integrados en PR #42

En `feat/navegacion-contadores` se implementan breadcrumbs navegables en detalles, contadores globales en la sidebar, topbar sticky con búsqueda centrada y cierre de sesión en el popover del usuario, eyebrows de sección y círculos de autor en registros de entrega/evento. Se unifican las acciones de tabla y el acceso por fila en juntas; el selector de solicitud en el formulario de entrega se oculta a usuarios normales. Ver [Navegación](./navegacion.md).

Se conserva la confirmación actual al eliminar usuarios, sin exigir escribir el correo, y la identidad actual de la barra superior. Son decisiones de producto, no pendientes de paridad.

## Nuevos cambios aprobados: dos entregas separadas

1. **Entregas**, integrado mediante PR #43: Observaciones opcionales persistidas y auditadas, controles de fotografías y archivos múltiples opcionales desactivados. Ver [Entregas](./entregas.md).
2. **Eventos**, integrado mediante PR #44: cambiar Sector por Dirección conservando los valores existentes; agregar Informe ALFA (PDF), fotografías y archivos opcionales, todos desactivados hasta implementar el manejo de archivos.

Esos dos bloques no incluían almacenamiento. El PR #45 activa todos los adjuntos con R2 privado. La etapa actual `feat/carga-directa-r2` adapta las cargas para soportar 25 MB en Vercel; revisión local antes de commit/PR y merge a cargo del usuario.

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

## Pendientes de despliegue

- Carga directa R2 para evitar el límite de peticiones de Vercel: implementada en revisión local, con CORS para el dominio de producción y localhost. Ver [Archivos R2](./archivos-r2.md).
- Programación de limpieza periódica en Vercel: pospuesta por decisión del usuario. Se conserva el endpoint para el futuro VPS o un programador externo.
- Verificar migraciones y variables en el entorno de producción tras desplegar.

## Ajustes solicitados de interfaz (17 de noviembre de 2026)

Se implementan en ramas separadas para revisión antes de commit/PR:

1. **Plan RRD** — integrado en PR #48: título truncado y columnas visibles en tabla de acciones; contador de adjuntos por actividad; participantes opcionales; línea roja de Hoy más gruesa en cronograma.
2. **Adjuntos** — integrado en PR #49: selector compartido en español, borde discontinuo e icono de carga como el spike, con selección por clic/teclado y arrastre.
3. **Entregas** — integrado en PR #50: fondo gris del panel lateral con encabezado y tarjetas blancos; unidades asociadas al insumo, primera disponible seleccionada y sin placeholder «Unidad…».
4. **Resumen y sidebar** — en revisión local en `fix/resumen-iconos-sidebar`: clases de iconos corregidas para restaurar fondos y esquinas redondeadas; badges en negrita y camión en el acceso Entregas. Incluye el traslado de Insumos y Juntas a tarjetas de Configuración, accesibles según permisos existentes para ambos roles.

La limpieza periódica continúa pospuesta.

En revisión local en `feat/catalogo-vistas`: Configuración pasa a Catálogo; Tipos de evento se separa en una vista propia con acceso desde una tarjeta, como Insumos y Juntas. Se actualizan navegación, breadcrumbs y eyebrows.
