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
