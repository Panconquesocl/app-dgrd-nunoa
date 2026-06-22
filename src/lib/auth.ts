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
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Restringe el alta de cuentas (password y Google OAuth) al dominio
        // institucional. Para OAuth el email solo se conoce tras la respuesta
        // del proveedor, por eso la validación vive aquí y no en un before hook.
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
