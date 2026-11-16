# Búsqueda global

Implementada desde main en una feature independiente de los filtros de Entregas. Sin migración, archivos, visualización ni georreferenciación.

## Interfaz

Acceso en la barra superior de las vistas autenticadas. En escritorio muestra icono y texto; en móvil conserva el icono con etiqueta accesible. Abre un diálogo mediante el botón o Ctrl/⌘ K. Escape cierra y devuelve el foco al acceso de búsqueda. El foco inicial queda en el campo; Tab recorre enlaces y las flechas arriba/abajo recorren resultados después de entrar en la lista.

Se buscan de 2 a 200 caracteres, con debounce de 300 ms, sin filtrar por año. El diálogo agrupa resultados por módulo, muestra hasta cinco por grupo e indica si hay más. Cada fila abre su detalle; «Ir al módulo» abre el listado general correspondiente (no aplica automáticamente el texto a sus filtros). Se conserva la estructura visual existente y el contenido desplaza dentro del diálogo, también en móvil.

Hay estados inicial, búsqueda en curso, sin resultados y error con reintento. Cambiar el texto oculta resultados de la consulta anterior, evitando mostrar un RUT o entidad distintos mientras se espera la nueva respuesta. Cerrar descarta el texto y los resultados locales.

## Alcance

| Grupo                 | Campos de búsqueda                                                                               | Destino              |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------- |
| Entregas              | Folio, beneficiario, RUT completo/parcial, dirección, junta por nombre/número y folio del evento | Detalle de entrega   |
| Juntas vecinales      | Nombre o número, incluidas inactivas                                                             | Detalle de junta     |
| Insumos               | Nombre o unidad                                                                                  | Historial del insumo |
| Acciones estratégicas | Título, temas, implementación, número o año                                                      | Detalle de acción    |
| Actividades           | Objetivo, dirección, participantes o título de la acción                                         | Detalle de actividad |
| Solicitudes           | Folio, medio, descripción o respuesta                                                            | Detalle de solicitud |
| Eventos               | Folio, sector, instituciones, acciones o tipo                                                    | Detalle de evento    |

Los textos no distinguen mayúsculas, manteniendo el comportamiento de los módulos actuales. El RUT usa la misma búsqueda parcial de Entregas, ignorando puntos, guion, espacios y mayúscula del verificador, incluso en fragmentos que incluyen el verificador. No se identifican personas por coincidencias de nombre ni se crean fichas nuevas de beneficiarios.

## API, permisos y caché

GET `/api/search?q=...` requiere sesión y `search:read`. Devuelve `{ query, groups }`, con grupos `{ key, label, href, results, hasMore }` y filas `{ id, title, description, href }`. Consulta como máximo seis registros por grupo para detectar si hay más; devuelve cinco, con orden estable y sin conteos globales adicionales.

El rol proviene exclusivamente de la sesión. Cada consulta verifica `read` del módulo antes de ejecutarse. Usuarios normales reciben cinco grupos: entregas, juntas, insumos, acciones y actividades. Solo administradores reciben además solicitudes y eventos. Los módulos no permitidos se omiten incluso cuando están vacíos, sin ejecutar sus consultas. Las rutas de detalle conservan sus propios guards.

La respuesta HTTP es privada y no almacenable. La consulta de cliente se separa por usuario, permisos de módulos restringidos y texto. No conserva resultados al cerrar ni reutiliza datos entre textos distintos; al volver a abrir consulta nuevamente. Las peticiones obsoletas se cancelan mediante AbortSignal. Usuarios desconocidos no ven el acceso y la API rechaza sus consultas.

## Verificación

- Matriz de permisos, autorización antes de parsear, rol exclusivamente de sesión y límites del texto.
- Comprobación con servicios simulados de que usuarios normales no consultan solicitudes/eventos.
- Integración PostgreSQL: búsqueda en todos los módulos, mayúsculas, RUT parcial/formateado, cinco resultados y `hasMore`, destinos correctos, ausencia de registros restringidos y búsqueda vacía.
- Revisión visual del usuario antes de commit/PR: escritorio/móvil, apertura desde distintas vistas, teclado, estados y cambio de texto o RUT.

Integración contra base aislada: `RUN_SEARCH_INTEGRATION=1 node --import tsx --test src/features/search/service.integration.test.ts`.
