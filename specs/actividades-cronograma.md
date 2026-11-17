# Actividades y cronograma

Implementación desde main con referencia funcional y visual exclusiva al spike. La etapa actual incorpora evidencia privada en R2; no agrega estados de actividad. Ver [Archivos R2](./archivos-r2.md).

## Reglas

Acción estratégica, fecha calendario, dirección y objetivo son obligatorios. Participantes es texto libre opcional: vacío u omitido se guarda como una cadena vacía, sin modificar los registros anteriores ni requerir migración. Usuarios normales y administradores gestionan actividades de cualquier autor. El autor de creación se conserva al editar.

La fecha debe quedar dentro del periodo de la acción, incluyendo ambos extremos. El servidor valida dentro de una transacción bajo bloqueo compartido de la acción. Editar el periodo toma bloqueo exclusivo y rechaza cambios que dejen actividades fuera. Esto impide violaciones por creación o edición concurrente. Reasignar una actividad valida también el periodo de la nueva acción.

Eliminar exige confirmación y conserva la acción. La evidencia nueva se elimina de R2 con advertencia y previsualización previa. La evidencia histórica sin bucket sigue bloqueando el borrado hasta revisión.

No se corrigen ni borran datos históricos fuera de periodo. Una actividad histórica debe guardarse con una fecha válida al editarla; el periodo de su acción solo se puede guardar si incluye todas las actividades. La etapa R2 requiere su migración y regeneración de Prisma.

## Interfaz

- Acciones estratégicas y Cronograma tienen accesos separados en la sidebar y eyebrow «Plan RRD», sin pestañas de navegación entre módulos.
- Nueva actividad desde el detalle de la acción o desde el cronograma. Edición, detalle y eliminación desde `/plan/actividades/[id]`.
- Formulario con encabezado y botones fijos, solo los campos desplazan; fecha con límites visibles según acción seleccionada.
- `/plan/cronograma`: selector de año, barras amarillas del periodo de acción, puntos y agrupaciones de actividades cercanas, leyenda, marca Hoy y enlaces a acciones/actividades. Vista alternativa de agenda agrupada por mes. Se conserva la estructura visual del spike, con evidencia disponible en el detalle de actividad.
- Línea temporal con desplazamiento horizontal en pantallas pequeñas; enlaces accesibles por teclado y detalles de los puntos al enfocar.
- Fechas de calendario y posiciones en UTC; Hoy usa la fecha de Chile. Barras recortadas a los límites del año. La agenda utiliza el año calendario de cada actividad; las filas de acciones siguen su año declarado, como en el spike.

La caché de actividades, cronograma y acciones se actualiza tras altas, ediciones y borrados. Cambiar el título o periodo de una acción actualiza el contexto de sus actividades.

## API y verificaciones

POST `/api/activities`; GET/PATCH/DELETE `/api/activities/[id]`; GET `/api/activities/schedule`. Permisos en servidor antes de parsear o acceder a datos. PATCH recibe los campos editables completos.

Pruebas de campos obligatorios, fechas, límites inclusivos, reasignación, cambios concurrentes de periodo, conservación de acción, posiciones anuales y agrupación; rutas de ambos roles y rechazo de accesos sin sesión o rol reconocido.

Integración solo con DATABASE_URL de pruebas aislada: `RUN_ACTIVITIES_INTEGRATION=1 node --import tsx --test src/features/activities/service.integration.test.ts`.

## Revisión manual

Crear una acción con periodo; registrar actividades en inicio, término y fechas intermedias; intentar guardar una fuera del periodo y acortar el periodo excluyendo una actividad. Editar o borrar una actividad de otro autor con usuario normal. Verificar actualización de cronograma y conteos. Abrir puntos individuales y agrupados, cambiar año y alternar agenda. Comprobar en escritorio y móvil, incluyendo scroll del formulario y de la línea temporal. Revisar visualmente antes de commit y PR.

## Ajustes de paridad del Plan RRD (17 de noviembre de 2026)

En revisión local en `fix/plan-rrd-tabla-actividades`: tabla de acciones con título truncado y columnas acotadas para evitar que un texto largo fuerce scroll en escritorio; en pantallas estrechas se conserva el desplazamiento dentro de la tabla. El enlace conserva el título completo y lo muestra al pasar el cursor. El detalle de acción incluye, a la derecha de cada actividad, un badge con clip y cantidad de adjuntos confirmados; sin adjuntos muestra «Sin evidencia», como el spike. Los pendientes de carga no se cuentan. Al completar o borrar archivos se refresca el contador de acciones.

El formulario indica Participantes como opcional; la API acepta omisión y blanco, mantiene el límite de 2000 caracteres y las demás validaciones. El detalle muestra «Sin participantes registrados» cuando no se informó. La línea Hoy del cronograma usa el borde rojo discontinuo de 1,5 px sin la opacidad reducida, siguiendo el spike.

Validación del bloque: 69 pruebas generales aprobadas y las dos pruebas de integración de Actividades en PostgreSQL aislado, incluyendo guardado sin participantes y conteo que excluye pendientes. TypeScript, ESLint, formato y build con Turbopack correctos. Navegador: títulos de 500 caracteres sin scroll horizontal de tabla en 1440/1280/1024 px, badges con y sin adjuntos, alta sin participantes, línea de Hoy y móvil a 390 px sin desbordamiento de página. Sin errores JavaScript. No requiere migración; los fixtures se retiran tras revisar.
