# Revisión integral

Revisión del 16 de noviembre de 2026, sobre `main` después del PR #40 (`816bb9e`). Correcciones en `fix/revision-integral`. La referencia funcional y visual sigue siendo `spike/test-mockup`.

## Correcciones

- Se contiene la posición de las etiquetas accesibles de las cabeceras de tablas. Las columnas fuera de pantalla conservan el scroll interno sin ampliar el documento.
- Se ajustan las barras de filtros, etiquetas de tipos de evento, acciones estratégicas, detalles de acción y controles de usuarios para anchos pequeños. El período de entregas se distribuye en dos filas en pantallas estrechas.
- El listado y el detalle de acciones estratégicas usan el mismo contenedor y padding que las otras vistas. Cerrar sesión pasa de la barra superior al pie de la sidebar, con texto en el menú expandido e icono con nombre accesible en el plegado.
- El formulario de entrega conserva encabezado y botones visibles con fondo sólido; solo desplazan los campos. El aviso por RUT permanece superpuesto sin desplazar otros campos.
- Login usa la misma comprobación de sesión y cuenta desactivada que el resto de la aplicación. Los destinos de retorno se normalizan y validan para evitar salidas a otro origen o bucles hacia login.
- El cierre de sesión cancela consultas y elimina la caché de la cuenta anterior. Si falla, muestra un mensaje y permite reintentar.
- Se corrigen pruebas antiguas que aún exigían junta vecinal y omitían el RUT obligatorio. Se agregan pruebas de navegación y limpieza de caché entre sesiones.
- Se actualiza el backlog para distinguir funcionalidades integradas, pendientes y exclusiones.

## Verificación

| Comprobación                                                 | Resultado                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Unidades, contratos, permisos y rutas (`pnpm test`)          | 58 pruebas aprobadas                                                              |
| Integraciones de todos los módulos (`pnpm test:integration`) | 20 pruebas aprobadas, sin omisiones                                               |
| Compilación de producción                                    | Aprobada                                                                          |
| ESLint, TypeScript y formato                                 | Aprobados                                                                         |
| Navegación visual y permisos                                 | 53 comprobaciones, cero desbordamientos de documento y cero errores de JavaScript |

La revisión visual automatizada usó Chromium en Brave, con contextos nuevos, a 1440, 390 y 320 píxeles. Incluyó listados administrativos, detalles de evento/solicitud/acción/actividad/entrega, búsqueda global, formulario de entrega y accesos restringidos del usuario normal. Antes de las correcciones se detectaron 27 casos de desbordamiento de documento. Las tablas amplias mantienen su desplazamiento horizontal interno.

También se verificaron en navegador estos recorridos:

- Aviso por RUT sin desplazar campos y botones fijos durante el scroll del formulario.
- Solicitud → entrega: hereda evento, admite junta vacía y conserva el estado de la solicitud.
- Evento → entrega directa: no exige solicitud ni preselecciona una; propone la fecha del evento.
- Filtros combinados de beneficiario y RUT parcial.
- Usuario normal modifica un insumo de otro autor, no accede a administración y queda auditado con el actor real de sesión, incluso si envía otro actor en el cuerpo.
- Cuenta desactivada con cookie existente llega a login sin bucle.
- Destino externo de retorno rechazado.
- Fallo de cierre de sesión permite reintentar; el cierre correcto vuelve a login y revoca el acceso.

## Entorno y reproducción

Se utilizó Node 24, una base PostgreSQL local exclusiva de pruebas, cuentas temporales y un servidor de producción local independiente. No se modificó la base operativa. Esta rama no agrega migraciones.

```bash
pnpm test
TEST_DATABASE_URL=postgresql://usuario@host:puerto/base_pruebas pnpm test:integration
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm build
```

El runner de integración exige una URL explícita, rechaza el mismo destino declarado en `.env`, aplica migraciones y habilita todas las suites de integración. Debe apuntar a una base exclusiva de pruebas. El runner general excluye archivos de integración y no requiere base de datos.

Los recorridos de navegador se ejecutaron con scripts temporales de QA; no se incorporan como suite permanente del repositorio. La comprobación de anchos no sustituye la revisión visual del usuario ni una prueba en dispositivos físicos.

## Alcance pendiente

Archivos y evidencia continúan pendientes. Visualización y georreferenciación quedan fuera del alcance. Exportaciones, inventario, recordatorios e importaciones genéricas requieren un acuerdo posterior. La publicación de la rama y el PR se realizan únicamente a solicitud del usuario; el merge queda a su cargo.
