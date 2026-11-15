# Tipos de evento

Rama creada desde main. Referencia funcional y visual: Configuración de `spike/test-mockup`.

Solo administradores pueden abrir `/admin/configuracion` y gestionar `/api/event-types` (GET/POST) y `/api/event-types/[id]` (PATCH/DELETE). La navegación muestra Configuración según el permiso `event-types.read`.

El nombre es obligatorio, de hasta 200 caracteres. Se recortan espacios al inicio/final y se conserva la escritura elegida. Un índice funcional `lower(btrim(name))` garantiza unicidad incluso en altas o ediciones concurrentes. Renombrar conserva el id y actualiza el nombre mostrado por los eventos relacionados. La pantalla incluye búsqueda local y conteo de eventos por tipo.

El borrado está bloqueado si hay eventos relacionados. Se comprueba en el servidor bajo bloqueo de fila y la FK Restrict sigue siendo la protección final. La UI muestra el motivo y no ofrece confirmar un borrado conocido como bloqueado.

## Migración y revisión

`20261115190000_event_type_name_unique` agrega el índice único. No fusiona ni renombra tipos existentes: si hay duplicados normalizados, se detiene y requiere revisar y reasignar los registros antes de continuar. No editar migraciones ya aplicadas ni resetear datos para saltar esta protección.

Aplicar en la base de revisión con `pnpm exec prisma migrate deploy`. No requiere cambios de datos ni nuevas columnas.

Validación: pruebas de nombres, unicidad concurrente, renombrado visible desde evento, conteo, borrado permitido y bloqueado; rutas reales con 401/403 antes de consultar o parsear. Integración solo contra una base aislada con `RUN_EVENT_TYPE_INTEGRATION=1` y `DATABASE_URL` de pruebas.

Revisión manual: abrir Configuración como administrador, crear un tipo, buscarlo, renombrarlo y borrarlo. Comprobar duplicados con mayúsculas/espacios y el bloqueo de un tipo en uso. Verificar formulario, tabla y diálogos en móvil. La gestión de eventos se implementará en la siguiente feature; el contador ya consulta los eventos existentes.
