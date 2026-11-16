# Auditoría de cambios

Implementada desde main en una rama independiente. Registra operaciones nuevas; no reconstruye historial ni deduce quién realizó cambios anteriores.

## Alcance

Altas, modificaciones y eliminaciones de entregas, insumos, juntas vecinales, solicitudes, eventos, acciones estratégicas, actividades, tipos de evento y cuentas gestionadas desde Usuarios. Captura también cambios derivados de vínculos: crear un evento desde solicitud, cambiar el evento de una solicitud, desvincular solicitudes/entregas al borrar un evento y modificar los insumos de una entrega.

Se guarda fecha y hora, módulo, acción, identificador y etiqueta del registro, usuario ejecutor con su nombre y correo en ese momento, identificador común de operación y valores anteriores/nuevos. Las modificaciones incluyen solo campos que realmente cambiaron; no se registra un guardado sin cambios ni el cambio técnico de updatedAt. Altas conservan el estado inicial y eliminaciones el estado final anterior al borrado.

La identidad del ejecutor viene de la sesión y se pasa explícitamente a los servicios; no se utiliza el autor original ni un campo enviado por el cliente. No hay FK desde el historial al usuario o a la entidad, por lo que ambos pueden desaparecer sin perder trazabilidad. Los logs no se cuentan como autoría de registros operativos para impedir la eliminación de cuentas: conservan una identidad histórica independiente.

Los cambios de insumos generan registros propios de modificación dentro del módulo Entregas, con el identificador de la entrega y el mismo identificador de operación que el alta/edición/borrado principal. Así se conserva la traza de cada ítem sin depender de su existencia posterior.

## Consistencia y campos excluidos

La migración instala triggers de PostgreSQL sobre las tablas de dominio, con una lista explícita de campos permitidos. Los servicios de escritura usan `auditedTransaction(actorId, work)`, que toma una instantánea del actor y establece contexto local a la transacción. El cambio operativo y sus logs se confirman juntos: cualquier error revierte ambos. Los triggers capturan el estado real bloqueado por la escritura, incluso en cascadas o actualizaciones concurrentes.

El contexto es local y no persiste al devolver la conexión al pool. Lecturas, seeds, tareas externas y SQL ejecutado fuera de los servicios con contexto no se registran ni se atribuyen a un usuario inventado. No hay backfill. La auditoría cubre los servicios de negocio actuales; no incorpora un historial de acceso, inicio/cierre de sesión o renovación de sesiones de Better Auth.

No se registran contraseñas, hashes, tokens, sesiones ni credenciales. No hay triggers sobre las tablas de credenciales/autenticación. Restablecer contraseña desde Usuarios añade únicamente el hecho `passwordReset: true`, sin valores de contraseña anteriores o nuevos. La lista explícita evita incluir automáticamente futuras columnas sensibles.

## Consulta administrativa

`/admin/auditoria` y GET `/api/audit` / `/api/audit/actors` requieren `audit:read`, exclusivo de administradores. La barra lateral oculta el acceso a los demás roles y la página/API aplican sus propios guards. No hay controles ni endpoints de edición o borrado del historial; el mantenimiento de la base queda fuera de la interfaz.

La tabla muestra fecha y hora de Chile en formato 24 horas, usuario, módulo, acción y registro. «Ver cambios» muestra identificador y valores antes/después, incluidos campos que quedaron vacíos. Los filtros de módulo, acción, actor y período se combinan. El selector de actores utiliza las instantáneas guardadas, incluidas cuentas eliminadas. Las fechas incluyen el día completo en America/Santiago, respetando el cambio de horario.

Paginación por cursor, 50 registros por carga, orden descendente estable por timestamp e id. «Cargar más» conserva las páginas anteriores; cambiar filtros inicia una consulta nueva. «Actualizar» consulta nuevamente historial y actores. La respuesta HTTP es privada y no almacenable; la caché de cliente se separa por usuario/rol y se descarta al abandonar la vista. Hay estados de carga, vacío, error y reintento; la tabla desplaza horizontalmente en móvil.

## Migración y despliegue

`20261116040000_audit_log` crea tabla, índices, función y triggers. Conserva todos los datos existentes. No modifica cuentas, registros de dominio ni reglas de eliminación. Requiere aplicar la migración antes de ejecutar el código actualizado:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Las funciones/triggers son parte de la migración y deben preservarse al desplegar o regenerar bases. La migración se probó en una base aislada; no se aplicó automáticamente a la base operativa.

## Verificación

- Integración de todos los módulos, actor distinto del autor original, no-op sin nuevo log, rollback sin log ni registro operativo y borrado bloqueado sin rastros.
- Propagación evento → solicitud → entrega, modificaciones de insumos y conservación del historial al eliminar entidades/cuentas.
- Restablecimiento de contraseña y ausencia de valores de credenciales en logs.
- Período inclusivo de Chile frente a UTC y paginación sin duplicados.
- Rutas, menú y página exclusivos de administradores; identidad del actor exclusivamente de la sesión.
- Regresiones de las integraciones de todos los módulos y autenticación de prueba con base aislada.

Integración específica: `RUN_AUDIT_INTEGRATION=1 node --import tsx --test src/features/audit/service.integration.test.ts`.

Revisión visual antes de commit/PR: crear/editar/borrar registros, filtrar por actor/módulo/acción/período, expandir diferencias, cargar más y revisar en móvil. Los registros históricos previos a esta función no aparecerán como operaciones antiguas.
