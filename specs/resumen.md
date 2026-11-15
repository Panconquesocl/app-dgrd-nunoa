# Resumen anual

Implementado desde main usando únicamente la vista Resumen del spike como referencia. `/` redirige a `/resumen`. Ambos roles pueden consultar el resumen de los módulos que tienen permitidos.

## Datos y periodo

El filtro anual inicia en el año actual de America/Santiago y ofrece años presentes en los datos permitidos, además del actual y seleccionado. Se valida el intervalo 1900–2200. No se crean registros ni nuevas tablas.

- Entregas, eventos y actividades: fecha calendario, desde 1 de enero incluido hasta 1 de enero siguiente excluido. Fechas calendario en UTC, sin corrimiento al día anterior.
- Solicitudes: fecha de creación dentro del año de Chile. Los límites y los años disponibles se calculan con la zona horaria de PostgreSQL, no con offsets fijos.
- Acciones estratégicas: año declarado del plan, igual que Cronograma. El conteo de actividades de cada acción corresponde al año seleccionado.
- Insumos: cantidades de ítems de entregas del año, agrupadas por insumo y unidad. El total de distribución se presenta por unidad normalizada (minúsculas y espacios exteriores), sin convertir unidades ni sumarlas entre sí. El contador de la tarjeta indica insumos distribuidos distintos en el año; el pie de Entregas muestra el total del catálogo, que es global.

Se muestran como máximo cuatro registros por tarjeta. Solicitudes prioriza pendientes y luego otras por creación reciente. Agenda prioriza fechas de hoy en adelante en orden ascendente y completa con las pasadas más recientes. No se añade un estado de realización a las actividades: la etiqueta Anterior describe solo su fecha. Entregas y eventos se ordenan por fecha reciente; acciones por número; insumos por cantidad distribuida con su unidad indicada.

Las tarjetas y cifras se consultan en una transacción RepeatableRead para compartir la misma instantánea. Las listas están limitadas en el servidor; el cliente no recibe todo el dominio.

## Permisos y caché

GET `/api/summary?year=AAAA` comprueba sesión y permiso `summary.read` antes de validar o consultar. El rol se toma de la sesión, nunca de la URL.

El usuario normal no recibe las secciones Solicitudes/Eventos, sus conteos, ids, relaciones ni años disponibles exclusivos de esos módulos. El servicio no ejecuta sus consultas para ese rol. Un rol desconocido se rechaza también en la página y en el servicio.

La caché se separa por usuario, rol y año para evitar reutilizar un resumen de otra cuenta. Las mutaciones de entregas, insumos, juntas, solicitudes, eventos, tipos de evento, acciones y actividades invalidan el resumen. Las ediciones de usuarios ya invalidan toda la caché de datos.

## Presentación

Indicadores, tarjetas en dos columnas, filas con iconos y enlaces, contadores y pies siguen el spike. En pantallas pequeñas las tarjetas se apilan. Se conservan estados de carga, error con reintento y vacío por tarjeta. Las cantidades se formatean en es-CL y siempre muestran su unidad.

Los enlaces de registros llevan al detalle. Ver todo y los indicadores abren el módulo correspondiente con sus filtros propios; el filtro de Resumen no modifica los listados de otros módulos.

## Verificación

Pruebas con PostgreSQL temporal: límites anuales de fechas y de solicitudes en Chile, suma por unidad, identidad de insumos, prioridades y límite de cuatro filas, años disponibles filtrados por rol, ausencia de datos restringidos y años vacíos. Rutas: 401/403 antes de consultar o validar, rol de servidor y año inválido. Páginas para ambos roles y redirección inicial.

Integración solo con DATABASE_URL aislada: `RUN_SUMMARY_INTEGRATION=1 node --import tsx --test src/features/summary/service.integration.test.ts`.

Revisión manual: abrir Resumen como administrador y usuario normal, cambiar año y contrastar cantidades con entregas; abrir registros desde cada tarjeta; crear/editar un registro y volver a Resumen para comprobar actualización; verificar escritorio y móvil. No requiere migración ni regeneración de Prisma. Pendiente revisión visual local antes de commit/PR.
