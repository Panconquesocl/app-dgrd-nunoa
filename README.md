# DGRD Ñuñoa — Sistema de Gestión de Emergencias

Sistema interno de la Dirección de Gestión del Riesgo de Desastres de la Municipalidad de Ñuñoa.

Stack: **Next.js 16** (App Router, React 19) · **PostgreSQL + Prisma 7** · **Better Auth** · **TanStack Query** · **Tailwind v4 + shadcn**.

## Requisitos

- Node.js 20.19+ / 22.12+ / 24+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (para la base de datos local)

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env: genera el secret con `openssl rand -base64 32`
# y define ADMIN_EMAIL / ADMIN_PASSWORD para la cuenta inicial.

# 3. Levantar la base de datos (PostgreSQL en Docker)
docker compose up -d

# 4. Aplicar las migraciones y generar el cliente de Prisma
pnpm prisma migrate dev

# 5. Crear la cuenta de administrador inicial
pnpm db:seed

# 6. Iniciar el servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Base de datos (Docker)

El archivo `docker-compose.yml` levanta un PostgreSQL 17 local:

| Parámetro | Valor           |
| --------- | --------------- |
| Host      | `localhost`     |
| Puerto    | `5432`          |
| Usuario   | `dgrd`          |
| Password  | `dgrd`          |
| Base      | `dgrd_nunoa`    |
| Container | `dgrd-nunoa-db` |

Comandos útiles:

```bash
docker compose up -d      # iniciar en segundo plano
docker compose down       # detener (conserva los datos)
docker compose down -v    # detener y borrar el volumen (resetea la base)
docker compose logs -f    # ver logs
pnpm prisma studio        # explorar los datos en el navegador
```

> El `DATABASE_URL` por defecto en `.env.example` ya apunta a este contenedor.

## Autenticación

Autohospedada con Better Auth, **sólo correo + contraseña** (sin proveedores externos).

- Configuración del servidor: `src/lib/auth.ts` · cliente: `src/lib/auth-client.ts`
- Acceso restringido al dominio institucional (`ALLOWED_EMAIL_DOMAIN`, por defecto `nunoa.cl`).
- **No hay registro público** (`disableSignUp`): la primera cuenta se crea con `pnpm db:seed` y el resto las crea un administrador.
- Las contraseñas se guardan como hash scrypt en `account.password`; la tabla `user` nunca las contiene.
- Rutas protegidas: `src/proxy.ts` hace el filtro por cookie y `src/app/(app)/layout.tsx` valida la sesión contra la base de datos.
- Cerrar sesión (botón en la barra superior) revoca la sesión en la base de datos y redirige al login.

## Convenciones

- Usa `pnpm commit` (commitizen) en lugar de `git commit`. Husky valida formato con Prettier y mensajes con commitlint (conventional commits).
- Componentes shadcn en `src/components/ui/`, lógica compartida en `src/lib/`.

Más detalles para contribuir en [CLAUDE.md](./CLAUDE.md).
