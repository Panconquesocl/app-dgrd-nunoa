# Navegación y paridad con spike

Ajustes desde `main` después del PR #41, con referencia exclusiva a `spike/test-mockup`. Rama `feat/navegacion-contadores`, pendiente de integración, sin migración.

## Breadcrumbs

- Resumen y todas las vistas base de los módulos (Solicitudes, Eventos, Entregas, Insumos, Juntas vecinales, Cronograma, Acciones estratégicas, Usuarios, Configuración y Auditoría) no muestran breadcrumbs. Las vistas de detalle mantienen sus breadcrumbs.
- La barra superior es sticky con fondo sólido; permanece visible al desplazar la página. La búsqueda queda centrada dentro del área principal, los breadcrumbs a la izquierda y la identidad a la derecha. Las columnas laterales tienen el mismo ancho para conservar el centro aunque el nombre, correo o ruta sean largos. Nombre y correo se truncan cuando no caben; en móvil se conserva el avatar y el botón de búsqueda con icono.
- Los niveles con pantalla propia son enlaces. Las agrupaciones Plan RRD, Emergencias y Ayudas primera respuesta son texto; el último nivel también es texto con `aria-current="page"`.
- Solicitudes, eventos y entregas muestran el folio real. Insumos y juntas muestran su nombre. Durante la carga se usa el nombre genérico del recurso, sin enlaces a entidades aún desconocidas.
- Acciones: Plan RRD > Acciones estratégicas > N°1 · 2026.
- Actividades: Plan RRD > Acciones estratégicas > N°1 · 2026 > Actividad. El listado de acciones y la acción concreta son enlaces.
- Entregas: si tiene evento y permiso para leerlo, Emergencias > Eventos > folio del evento > folio de entrega. En ausencia de evento accesible, si tiene solicitud y permiso, Emergencias > Solicitudes > folio de solicitud > folio de entrega. En los demás casos, Ayudas primera respuesta > Entregas > folio de entrega.
- Los usuarios normales utilizan la ruta general de Entregas, sin folios ni enlaces de módulos restringidos en los breadcrumbs. Las páginas mantienen sus guards de servidor.
- Los detalles abiertos dentro de paneles laterales no agregan una segunda barra superior ni alteran los breadcrumbs del listado.
- Las etiquetas largas se desplazan horizontalmente dentro de la ruta, sin ampliar toda la página. Los enlaces funcionan con teclado, apertura en pestaña nueva y navegación del navegador.

## Sidebar

La navegación entre módulos se realiza desde la sidebar. Entregas, Insumos y Juntas vecinales muestran «Ayudas primera respuesta» como eyebrow encima del título; Acciones estratégicas y Cronograma muestran «Plan RRD». Se eliminan las pestañas de navegación entre esas vistas. Cronograma conserva el selector de año y las vistas de línea temporal/actividades.

Solicitudes, Eventos y Entregas muestran el total global de registros, como en el spike. No dependen del año del resumen, los filtros de listados ni el estado de la solicitud. No cuentan personas ni cantidades de insumos. En cero se muestra 0; durante la carga o ante error se muestra un guion, sin inventar un cero.

GET `/api/summary/counts` exige sesión y `summary:read`. El servicio comprueba además lectura por módulo antes de consultar y omite los totales de Solicitudes/Eventos para usuarios normales. Consulta solo conteos, sin cargar listados, dentro de una transacción RepeatableRead. La respuesta es privada y no almacenable.

La consulta de cliente se separa por usuario y rol dentro de la familia de caché del resumen, por lo que las invalidaciones existentes tras mutaciones también actualizan los contadores. Al cerrar sesión se cancela y limpia esa caché. Los contadores se ocultan al plegar la sidebar; su cifra queda en el nombre accesible del enlace.

Cerrar sesión se encuentra en el popover que abre el usuario de la topbar, junto a su nombre y correo. Está disponible también desde el avatar en móvil, independientemente de que la sidebar esté plegada. La sidebar conserva únicamente su control para expandir/contraer en el pie. El popover se cierra con Escape o clic fuera; Escape devuelve el foco al usuario.

## Registro y decisiones conservadas

Entregas y Eventos incorporan el círculo con iniciales junto al autor en Registro, coherente con Solicitudes y Actividades. Las iniciales son decorativas; el nombre completo permanece visible.

Se conserva la confirmación actual de eliminación de usuarios, sin escritura obligatoria del correo, y la presentación actual de identidad en la barra superior. Los archivos siguen pospuestos. Datos históricos, visualización y georreferenciación están descartados del alcance.

En los listados de Solicitudes, Eventos, Entregas, Insumos y Juntas vecinales, las acciones de fila comparten el mismo estilo: con ratón aparecen al pasar el cursor por la fila o al enfocar sus controles con teclado. En pantallas táctiles permanecen visibles, sin depender de hover.

## Verificación de esta rama

- `pnpm test`: 62 pruebas aprobadas, incluyendo prioridad y permisos de breadcrumbs y autorización de los contadores, sin consultar módulos restringidos.
- TypeScript, ESLint y build de producción aprobados.
- Navegador contra PostgreSQL aislado: cifras reales por rol, alta/borrado de solicitud actualizan el contador sin recarga, rutas de entrega con evento/solicitud/sin vínculos y regreso por enlace contextual.
- Siete detalles a 1440, 390 y 320 píxeles: una sola barra de breadcrumbs, enlaces a pantallas, identificador final sin enlace y sin desbordamiento del documento. Cero errores de JavaScript.
- Sidebar expandida/plegada: los contadores se ocultan al plegar y reaparecen al expandir. Usuario normal recibe únicamente el total de entregas y la ruta general incluso si la entrega tiene evento. La comprobación original de Cerrar sesión en la sidebar es anterior a su traslado al popover del usuario.
- Círculo del autor comprobado visualmente en Registro de entrega. Las capturas y scripts de QA son temporales; no constituyen una suite permanente del repositorio.
- Tras mover Cerrar sesión al usuario: 28 pruebas de permisos/navegación aprobadas, TypeScript y lint correctos. Componente del popover verificado en navegador a 1440/390/320 píxeles: apertura por clic/teclado, Escape, clic fuera, fallo con reintento y éxito con limpieza de caché/redirección, simulando las respuestas de autenticación sin tocar sesiones reales. El centrado y sticky de la topbar se comprobaron nuevamente en cinco anchos de 320 a 1440 píxeles.
- Formulario de entregas verificado con servicios simulados para altas y ediciones de ambos roles: administrador conserva el selector de solicitud; usuario normal no lo ve ni envía cambios de solicitud al guardar. Las filas de juntas abren el detalle sin propagar el clic de sus acciones de edición/borrado.

No se ejecutaron pruebas sobre la base operativa. La publicación del PR se realiza a solicitud del usuario; el merge queda a su cargo.
