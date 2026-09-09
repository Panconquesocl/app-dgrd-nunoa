/**
 * Crea la cuenta de administrador inicial. Es el único camino para el primer
 * acceso, porque el registro público está deshabilitado (`disableSignUp`).
 *
 *   pnpm db:seed
 *
 * La contraseña nunca se guarda en claro: se cifra con el mismo hasher que usa
 * Better Auth en producción (scrypt) y el hash vive en `account.password`.
 */
import "dotenv/config"
import { randomUUID } from "node:crypto"
import { auth } from "../src/lib/auth"
import prisma from "../src/lib/prisma"

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl"

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || "Administrador"

  if (!email || !password) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD en tu archivo .env")
  }
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`ADMIN_EMAIL debe pertenecer al dominio @${ALLOWED_DOMAIN}`)
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`La cuenta ${email} ya existe; no se hizo ningún cambio.`)
    return
  }

  const ctx = await auth.$context
  const hashedPassword = await ctx.password.hash(password)
  const userId = randomUUID()

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  })

  console.log(`Administrador creado: ${email}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
