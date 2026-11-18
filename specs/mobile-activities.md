# Actividades móvil

Bloque en revisión conjunta con Solicitudes en `feat/mobile-solicitudes-actividades`, desde dev-mobile con PR #57 integrado. Ambos bloques se reúnen para probar el flujo completo y se publican juntos hacia dev-mobile tras la revisión. Esta rama tiene como destino dev-mobile.

## Comportamiento

Bajo 1024 px, coincidiendo con la barra inferior, Cronograma se presenta como Actividades y muestra únicamente la agenda agrupada por mes, con el año consultado indicado en texto. No se muestran selector anual, pestañas de agenda/línea temporal ni leyenda de Gantt. Se mantienen los datos y la selección anual existentes; el cambio de ancho no cambia el año ni la pestaña seleccionados en escritorio.

Las tarjetas muestran fecha, objetivo y dirección. Ver actividad aparece a la izquierda y Acción N° a su derecha, como enlaces separados sin controles anidados. Las actividades de cada mes se ordenan por fecha e identificador. Crear usa botón flotante inferior derecho con fondo oscuro y + amarillo, visible según permiso; se oculta bajo diálogos y confirmaciones.

El formulario móvil ocupa el viewport completo, conserva encabezado/acciones y desplaza solo campos. Confirma el descarte de cambios o adjuntos pendientes y mantiene las reglas de fechas dentro del periodo de la acción y participantes opcionales. El detalle conserva sus secciones de información/evidencia y registro; los breadcrumbs se ocultan en móvil mediante la estructura compartida. Escritorio mantiene línea temporal, selector anual y agenda anterior.

No hay cambios de API, permisos ni schema. Ambas presentaciones comparten la consulta de Cronograma y las operaciones existentes.

## Verificación

73 pruebas generales, TypeScript, ESLint, formato y build aprobados. El checkout reutiliza dependencias y cliente Prisma del proyecto; el build aislado se ejecutó con Next/webpack, sin modificar el entorno de Solicitudes.

Brave con administrador y usuario normal a 320/390/768/1440 px: agenda móvil y controles de escritorio según ancho, enlaces a actividad y acción, detalle sin breadcrumbs, edición, alta y refresco de agenda. Formulario a 320 × 640 px a pantalla completa, protección de descarte, participantes vacíos y rechazo de fecha fuera del periodo. Altas/ediciones reales en PostgreSQL aislado; sin desbordamientos ni errores JavaScript. Se retiran registros/cuentas temporales tras la revisión.

La revisión de viewport no sustituye una comprobación física de teclado y áreas seguras en Safari/iOS y Chrome/Android. El usuario solicitó publicar el PR conjunto hacia dev-mobile tras la revisión local.

Ajuste de revisión: la agenda única, la ocultación del selector de año/línea de tiempo y el botón + se activan en todo ancho menor de 1024 px. El formulario completo conserva su breakpoint de 768 px.

El acceso Actividades de la barra inferior y del logo abre `/plan/actividades`, una vista de agenda única para el año consultado. No se monta schedule-panel-head, el selector anual ni el contenido Gantt en esa ruta. `/plan/cronograma` sigue disponible para la navegación de escritorio. Ambas rutas usan la consulta y operaciones compartidas y el mismo permiso de lectura.

Verificación de la ruta exclusiva: ambos roles a 320/390/768/1023/1440 px, sin schedule-panel-head, selector de año ni Gantt en el DOM. Se comprobó que el botón inferior navega a /plan/actividades, el botón + aparece con la navegación móvil y /plan/cronograma mantiene sus controles de escritorio.
