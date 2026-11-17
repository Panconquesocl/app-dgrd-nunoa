# Implementación móvil

## Flujo de integración

`dev-mobile` parte de main y reúne los bloques móviles aprobados. Cada bloque se implementa en una rama desde dev-mobile, se revisa localmente y se publica mediante PR hacia dev-mobile a solicitud del usuario. El merge queda a cargo del usuario. Al terminar se abre un PR de dev-mobile a main. La rama spike/mobile y su mockup no se fusionan.

## Bloque 1: navegación y estructura

En revisión local en `feat/mobile-navegacion`:

- Bajo 1024 px se oculta la sidebar y aparece una barra inferior fija: Entregas, Solicitudes y Actividades. Solicitudes requiere su permiso de lectura; los demás destinos también comprueban lectura. Resumen no figura en la barra móvil y entrar a /resumen en ese ancho lleva a /plan/cronograma. Escritorio conserva Resumen y la navegación anterior.
- Actividades enlaza a /plan/cronograma y queda activa en las rutas del Plan RRD. La agenda como única presentación móvil se implementará en su bloque específico.
- Logo municipal a la izquierda de la topbar; búsqueda global junto al usuario a la derecha. La búsqueda mantiene su componente y comportamiento actuales.
- El popover de usuario en móvil oculta su encabezado de identidad y conserva solo Cerrar sesión. Radix mantiene el cierre al tocar fuera y por Escape.
- Bajo 768 px se ocultan breadcrumbs de detalles de entrega, solicitud y actividad, y se unifica el padding de contenido a 16 px.
- Barra inferior y contenido respetan el área segura del dispositivo. La barra se oculta mientras hay un diálogo o confirmación abiertos; los avisos flotantes se sitúan sobre ella.

Las media queries resuelven la distribución; los destinos usan Next Link y los permisos compartidos. No se duplica la consulta de cada módulo ni se usa detección de dispositivo en middleware. Las APIs y reglas de negocio permanecen compartidas.

## Bloques siguientes

1. Entregas: tarjetas, filtros, detalle, formulario y botón flotante.
2. Cámara y adjuntos: captura y selección integradas en el almacenamiento real.
3. Solicitudes: adaptación con los patrones validados.
4. Actividades: agenda móvil, detalles y creación.

No se consideran validados el teclado nativo, la cámara ni las áreas seguras de un dispositivo físico con una prueba de viewport de escritorio.

## Validación del bloque 1

73 pruebas generales, TypeScript, ESLint y build aprobados. Recorridos en Brave con administrador y usuario normal: acceso tras login a Cronograma en móvil, barra inferior filtrada por permisos, enlace y estado activo de Entregas, logo y topbar, popover con solo Cerrar sesión y cierre al tocar fuera, búsqueda global y ocultación de la barra bajo el diálogo. Revisado a 320, 390 y 768 px sin desbordamiento; a 1440 px se recupera sidebar y se oculta la barra inferior. Sin errores JavaScript. Base y cuentas de prueba aisladas; sin cambios de schema ni migraciones nuevas.

## Bloque 2: Entregas

En revisión local en `feat/mobile-entregas`, desde dev-mobile con PR #55 integrado. Bajo 768 px se muestran tarjetas con folio, beneficiario, RUT, fecha, junta y badges alineados a la derecha; las acciones se abren en popover con cierre exterior y por Escape. Escritorio conserva su tabla. Ambas presentaciones comparten una consulta y operaciones existentes.

La búsqueda queda visible; periodo y filtros se agrupan en un panel inferior. El panel usa un borrador y confirma con Aplicar; cerrar descarta cambios. Limpiar restablece el borrador, mientras Limpiar todo del listado sigue restableciendo búsqueda y filtros aplicados. Se conserva validación de fechas, filtros combinables, opciones y reintento.

Crear usa un botón circular fijo abajo a la derecha sobre la navegación, con fondo oscuro y + amarillo. El formulario móvil ocupa la pantalla, conserva encabezado/acciones y desplaza solo los campos. Los ítems se distribuyen en bloques con etiquetas de Unidad/Cantidad, teclado numérico y las unidades asociadas al insumo. Cancelar un formulario modificado o con archivos seleccionados pide confirmar descarte en móvil. El detalle usa el panel existente a pantalla completa; cerrar conserva filtros, listado y foco.

La captura de cámara se implementará en el siguiente bloque. Los selectores y cargas R2 existentes se conservan en esta etapa. No cambia el contrato de Entregas ni las reglas de negocio.

### Validación del bloque 2

73 pruebas generales, ESLint, TypeScript y build aprobados. En Brave se verificaron administrador y usuario normal: tarjetas bajo 768 px y tabla desde ese ancho, tamaños de 320/390/768/1440 px sin desbordamiento, cierre exterior de popovers, descarte y aplicación de filtros, limpieza de resultados, apertura/cierre de detalle, alta y edición reales sobre PostgreSQL aislado. El formulario ocupa el viewport completo, la unidad se selecciona según el insumo y Cantidad tiene inputMode numeric. Sin errores JavaScript. Durante QA se corrigió el desplazamiento de centrado heredado del diálogo de escritorio; se verificó de nuevo sobre el build final. Cámara y validación física del teclado móvil corresponden a su bloque posterior.

Comprobación adicional a 320 × 640 px: formulario sin desbordamiento, acciones visibles y confirmación de descarte verificada tanto al conservar como al descartar lo escrito. Se corrigió la suscripción a isDirty para activar esa protección.

La ocultación de barra inferior y botón flotante se limita a los Dialog/AlertDialog abiertos identificados por data-slot. Un Popover de Radix también usa role=dialog, por lo que ese rol por sí solo no distingue una capa modal: abrir acciones de tarjeta o el usuario debe mantener la navegación visible.
