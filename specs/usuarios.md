# Administración de usuarios

Implementación desde main con referencia funcional y visual exclusiva al spike. `/admin/usuarios` muestra cuentas con búsqueda por nombre/apellido/correo y filtros Activos, Inactivos y Todos. Solo administradores acceden a la página y a las rutas `/api/users`.

## Reglas

- Nombre y apellido separados, correo institucional y rol obligatorios. Contraseña inicial de 12 a 128 caracteres; se mantiene el mínimo vigente del sistema. No se recortan espacios de las contraseñas.
- El correo se normaliza a minúsculas y se recortan espacios exteriores; el dominio se comprueba con `ALLOWED_EMAIL_DOMAIN` (nunoa.cl por defecto). No se admiten subdominios ni dominios similares. El correo no es editable, y PATCH rechaza ese campo.
- Roles Administrador y Usuario regular. Se conservan los permisos actuales; roles legados `user` se interpretan como regular. El administrador puede corregir un rol desconocido.
- No se puede cambiar el propio rol, desactivar ni eliminar la propia cuenta. Se preserva al menos un administrador activo.
- Desactivar revoca sesiones y mantiene registros e identidad. Reactivar no restaura sesiones anteriores. Se respetan desactivaciones temporales históricas ya vencidas.
- Cambiar rol o restablecer contraseña revoca todas las sesiones de esa cuenta. Restablecer la propia contraseña redirige al login.
- Solo se eliminan cuentas inactivas sin historial. Se cuentan todos los recursos de autoría, incluidas juntas vecinales y evidencia. Las FK Restrict protegen frente a nuevos registros concurrentes. Sesiones y credenciales de una cuenta eliminable se eliminan por cascada.

## Autenticación y concurrencia

Las mutaciones usan transacciones Prisma y el hash scrypt exportado por Better Auth, compatible con el login actual. Nunca se devuelve ni se selecciona la contraseña en los DTOs. La reserva de usuario/credencial y los cambios con revocación de sesiones son atómicos.

Las operaciones administrativas se serializan mediante bloqueo transaccional y revalidan el rol/estado actual del ejecutor. Dos administradores no pueden degradarse o desactivarse mutuamente en paralelo dejando el sistema sin acceso administrativo. La sesión de una cuenta desactivada se rechaza también al entrar en páginas y rutas de dominio.

Los endpoints alternativos `/api/auth/admin/*` y `/api/auth/update-user` quedan bloqueados para que los cambios de cuenta pasen por las reglas de `/api/users`. El cambio de correo y la eliminación personal de cuenta están deshabilitados en Better Auth. El seed inicial sigue operativo y usa el mismo esquema y hasher; no hay registro público. Se mantiene el plugin admin para el modelo de rol/desactivación y la protección del login de cuentas desactivadas.

## API

- GET/POST `/api/users`: listado y creación.
- PATCH/DELETE `/api/users/[id]`: edición completa de nombre/apellido/rol o eliminación.
- PATCH `/api/users/[id]/status`: `{ active: boolean }`.
- POST `/api/users/[id]/password`: `{ password: string }`.

Las rutas autentican y autorizan antes de parsear. El servicio vuelve a comprobar al ejecutor dentro de la transacción. Los nombres de autores y la topbar se refrescan tras editar cuentas.

## Migración

`20261115210000_user_last_name_email_unique` agrega `user.lastName` nullable para conservar cuentas existentes sin inventar apellidos y crea un índice único sobre `lower(btrim(email))`. No separa automáticamente nombres históricos ni cambia correos/contraseñas/roles. Si hay correos duplicados normalizados, se detiene para revisarlos; no fusiona identidades.

Antes de probar: `pnpm exec prisma migrate deploy` y `pnpm exec prisma generate`. Al editar una cuenta histórica sin apellido, el administrador debe completarlo; no se exige para iniciar sesión.

## Verificación

Pruebas con PostgreSQL temporal aislado: normalización y duplicados, dominio, credenciales compatibles con login, revocación real tras restablecer contraseña/desactivar/cambiar rol, conservación de historial, borrado permitido y bloqueado, protección de la propia cuenta y cambios de rol concurrentes. Rutas con 401/403 antes de consultar o parsear; PATCH rechaza cambio de correo. Las rutas alternativas de autenticación se comprueban con sesión real de administrador.

Repetición: configurar exclusivamente una DATABASE_URL de pruebas y las variables BETTER_AUTH_URL, BETTER_AUTH_SECRET y ALLOWED_EMAIL_DOMAIN de ese entorno; ejecutar `RUN_USER_ADMIN_INTEGRATION=1 node --import tsx --test src/features/users/service.integration.test.ts`.

Revisión manual: abrir Usuarios como administrador; crear y buscar una cuenta; editar nombre/apellido; comprobar correo fijo y rol propio deshabilitado; cambiar rol a otra cuenta; restablecer contraseña; desactivar/reactivar y revisar sesiones desde otro navegador; comprobar eliminación con y sin historial. Repetir listado y diálogos en móvil. Pendiente revisión visual local antes de commit/PR.
