import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { APIError } from "better-auth/api"
import prisma from "./prisma"

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Autenticación autohospedada: sólo correo + contraseña, sin proveedores
  // externos. Better Auth guarda el hash (scrypt) en `account.password` con
  // providerId "credential"; la tabla `user` nunca contiene la contraseña.
  emailAndPassword: {
    enabled: true,
    // No hay registro público: las cuentas las crea un administrador.
    disableSignUp: true,
    minPasswordLength: 12,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // renueva la expiración una vez al día
    // Sin caché en cookie: cada request valida la sesión contra la base de
    // datos, de modo que un cierre de sesión o un baneo surten efecto al
    // instante.
    cookieCache: { enabled: false },
  },

  // Freno a la fuerza bruta. En memoria: el despliegue es un único
  // contenedor sin réplicas, así que no hace falta persistirlo en la base
  // de datos.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Restringe el alta de cuentas al dominio institucional.
        before: async (user) => {
          if (!user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            throw new APIError("FORBIDDEN", {
              message: `El acceso está restringido a correos institucionales (@${ALLOWED_DOMAIN}).`,
            })
          }
        },
      },
    },
  },

  plugins: [admin()],
})
