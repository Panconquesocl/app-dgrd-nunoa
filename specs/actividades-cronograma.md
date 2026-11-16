# Actividades y cronograma

Implementación desde main con referencia funcional y visual exclusiva al spike. Sin carga, descarga ni gestión de archivos, y sin estados de actividad.

## Reglas

Acción estratégica, fecha calendario, dirección, objetivo y participantes son obligatorios. Participantes es texto libre. Usuarios normales y administradores gestionan actividades de cualquier autor. El autor de creación se conserva al editar.

La fecha debe quedar dentro del periodo de la acción, incluyendo ambos extremos. El servidor valida dentro de una transacción bajo bloqueo compartido de la acción. Editar el periodo toma bloqueo exclusivo y rechaza cambios que dejen actividades fuera. Esto impide violaciones por creación o edición concurrente. Reasignar una actividad valida también el periodo de la nueva acción.

Eliminar exige confirmación y conserva la acción. Si hubiera evidencia histórica, se bloquea el borrado para evitar eliminar metadatos sin gestionar los archivos, fuera del alcance acordado. No se implementan endpoints ni controles de archivos.

No se corrigen ni borran datos históricos fuera de periodo. Una actividad histórica debe guardarse con una fecha válida al editarla; el periodo de su acción solo se puede guardar si incluye todas las actividades. No se requiere migración ni regeneración de Prisma.

## Interfaz

- Acciones estratégicas y Cronograma tienen accesos separados en la sidebar y eyebrow «Plan RRD», sin pestañas de navegación entre módulos.
- Nueva actividad desde el detalle de la acción o desde el cronograma. Edición, detalle y eliminación desde `/plan/actividades/[id]`.
- Formulario con encabezado y botones fijos, solo los campos desplazan; fecha con límites visibles según acción seleccionada.
- `/plan/cronograma`: selector de año, barras amarillas del periodo de acción, puntos y agrupaciones de actividades cercanas, leyenda, marca Hoy y enlaces a acciones/actividades. Vista alternativa de agenda agrupada por mes. Se conserva la estructura visual del spike, sin controles de evidencia.
- Línea temporal con desplazamiento horizontal en pantallas pequeñas; enlaces accesibles por teclado y detalles de los puntos al enfocar.
- Fechas de calendario y posiciones en UTC; Hoy usa la fecha de Chile. Barras recortadas a los límites del año. La agenda utiliza el año calendario de cada actividad; las filas de acciones siguen su año declarado, como en el spike.

La caché de actividades, cronograma y acciones se actualiza tras altas, ediciones y borrados. Cambiar el título o periodo de una acción actualiza el contexto de sus actividades.

## API y verificaciones

POST `/api/activities`; GET/PATCH/DELETE `/api/activities/[id]`; GET `/api/activities/schedule`. Permisos en servidor antes de parsear o acceder a datos. PATCH recibe los campos editables completos.

Pruebas de campos obligatorios, fechas, límites inclusivos, reasignación, cambios concurrentes de periodo, conservación de acción, posiciones anuales y agrupación; rutas de ambos roles y rechazo de accesos sin sesión o rol reconocido.

Integración solo con DATABASE_URL de pruebas aislada: `RUN_ACTIVITIES_INTEGRATION=1 node --import tsx --test src/features/activities/service.integration.test.ts`.

## Revisión manual

Crear una acción con periodo; registrar actividades en inicio, término y fechas intermedias; intentar guardar una fuera del periodo y acortar el periodo excluyendo una actividad. Editar o borrar una actividad de otro autor con usuario normal. Verificar actualización de cronograma y conteos. Abrir puntos individuales y agrupados, cambiar año y alternar agenda. Comprobar en escritorio y móvil, incluyendo scroll del formulario y de la línea temporal. Revisar visualmente antes de commit y PR.
