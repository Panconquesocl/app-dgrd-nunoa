import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { hashPassword, verifyPassword } from "better-auth/crypto"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { auth } from "@/lib/auth"
import { createUser, deleteUser, listUsers, resetUserPassword, setUserActive, updateUser } from "./service"
import { userCreateSchema, userEditSchema, userPasswordSchema } from "./schemas"

test("cuentas: campos, correo normalizado, edición estricta y mínimo de contraseña", () => {
  const input = {
    name: " Ana ",
    lastName: " Pérez ",
    email: " ANA@NUNOA.CL ",
    role: "regular",
    password: "testing-password-2026",
  }
  assert.equal(userCreateSchema.parse(input).email, "ana@nunoa.cl")
  assert.equal(userCreateSchema.parse(input).lastName, "Pérez")
  for (const field of ["name", "lastName", "email", "role", "password"])
    assert.equal(userCreateSchema.safeParse({ ...input, [field]: "" }).success, false)
  assert.equal(userPasswordSchema.safeParse({ password: "short" }).success, false)
  assert.equal(
    userEditSchema.safeParse({ name: "Ana", lastName: "Pérez", role: "regular", email: "other@nunoa.cl" }).success,
    false,
  )
})
test(
  "cuentas transaccionales, historial, concurrencia, login y revocación real",
  { skip: process.env.RUN_USER_ADMIN_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const marker = `users-${randomUUID()}`
    const actorId = `${marker}-admin`
    const otherId = `${marker}-other`
    const password = "isolated-user-password-2026"
    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl"
    const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3101"
    const conflict = (error: unknown) => error instanceof AppError && error.status === 409
    const forbidden = (error: unknown) => error instanceof AppError && error.status === 403
    const actorData = { name: "Prueba", lastName: "Admin", role: "admin", banned: false }
    const hashed = await hashPassword(password)
    for (const id of [actorId, otherId])
      await prisma.user.create({
        data: {
          ...actorData,
          id,
          email: `${id}@${domain}`,
          accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hashed } },
        },
      })
    const login = async (email: string, value: string) => {
      const response = await auth.handler(
        new Request(`${origin}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json", origin },
          body: JSON.stringify({ email, password: value }),
        }),
      )
      assert.equal(response.status, 200)
      const cookie = response.headers
        .getSetCookie()
        .find((value) => value.includes("session_token="))
        ?.split(";")[0]
      assert.ok(cookie)
      return cookie
    }
    const session = async (cookie: string) => {
      const response = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }))
      return response.json()
    }
    try {
      const user = await createUser(
        { name: "Nombre", lastName: "Apellido", email: `${marker}@${domain}`, role: "regular", password },
        actorId,
      )
      assert.equal(user.role, "regular")
      assert.equal(user.active, true)
      assert.equal("password" in user, false)
      const listing = await listUsers(actorId)
      assert.ok(listing.data.some((row) => row.id === user.id))
      assert.equal(JSON.stringify(listing).includes(hashed), false)
      await assert.rejects(
        createUser(
          {
            name: "Otro",
            lastName: "Apellido",
            email: `${marker.toUpperCase()}@${domain.toUpperCase()}`,
            role: "regular",
            password,
          },
          actorId,
        ),
        conflict,
      )
      await assert.rejects(
        createUser(
          { name: "Otro", lastName: "Apellido", email: `${marker}@foreign.invalid`, role: "regular", password },
          actorId,
        ),
        (error) => error instanceof AppError && error.status === 400,
      )
      await assert.rejects(listUsers(user.id), forbidden)
      await assert.rejects(
        updateUser(actorId, { name: "Prueba", lastName: "Admin", role: "regular" }, actorId),
        conflict,
      )
      await assert.rejects(setUserActive(actorId, false, actorId), conflict)
      await assert.rejects(deleteUser(actorId, actorId), conflict)
      await assert.rejects(deleteUser(user.id, actorId), conflict)
      const actorCookie = await login(`${actorId}@${domain}`, password)
      const oldCookie = await login(user.email, password)
      const loggedIn = await session(oldCookie)
      assert.ok(loggedIn?.user)
      assert.equal(loggedIn.user.lastName, "Apellido")
      for (const path of [
        "/admin/set-role",
        "/admin/ban-user",
        "/admin/unban-user",
        "/admin/remove-user",
        "/admin/update-user",
        "/admin/create-user",
        "/admin/set-user-password",
        "/admin/impersonate-user",
        "/update-user",
        "/change-email",
      ]) {
        const response = await auth.handler(
          new Request(`${origin}/api/auth${path}`, {
            method: "POST",
            headers: { "content-type": "application/json", cookie: actorCookie, origin },
            body: JSON.stringify({
              userId: actorId,
              role: "regular",
              name: "Bypass",
              newEmail: "changed@foreign.invalid",
            }),
          }),
        )
        if (path === "/change-email") assert.notEqual(response.status, 200, path)
        else assert.equal(response.status, 403, path)
      }
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: actorId } })).role, "admin")
      const newPassword = "reset-isolated-password-2026"
      await resetUserPassword(user.id, newPassword, actorId)
      assert.equal(await session(oldCookie), null)
      const credential = await prisma.account.findFirstOrThrow({
        where: { userId: user.id, providerId: "credential" },
        select: { password: true },
      })
      assert.ok(await verifyPassword({ hash: credential.password!, password: newPassword }))
      assert.equal(await verifyPassword({ hash: credential.password!, password }), false)
      const newCookie = await login(user.email, newPassword)
      await setUserActive(user.id, false, actorId)
      assert.equal(await session(newCookie), null)
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0)
      await setUserActive(user.id, true, actorId)
      const roleCookie = await login(user.email, newPassword)
      await updateUser(user.id, { name: "Renombrada", lastName: "Apellido", role: "admin" }, actorId)
      assert.equal(await session(roleCookie), null)
      await updateUser(user.id, { name: "Renombrada", lastName: "Apellido", role: "regular" }, actorId)
      await prisma.eventType.create({ data: { name: marker, createdBy: user.id } })
      await setUserActive(user.id, false, actorId)
      await assert.rejects(deleteUser(user.id, actorId), conflict)
      await prisma.eventType.deleteMany({ where: { createdBy: user.id } })
      await deleteUser(user.id, actorId)
      assert.equal(await prisma.user.findUnique({ where: { id: user.id } }), null)
      const results = await Promise.allSettled([
        updateUser(otherId, { name: "Prueba", lastName: "Admin", role: "regular" }, actorId),
        updateUser(actorId, { name: "Prueba", lastName: "Admin", role: "regular" }, otherId),
      ])
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
      assert.equal(
        await prisma.user.count({ where: { id: { in: [actorId, otherId] }, role: "admin", banned: false } }),
        1,
      )
      const inactiveActor = await prisma.user.findFirstOrThrow({
        where: { id: { in: [actorId, otherId] }, role: "regular" },
        select: { id: true },
      })
      await assert.rejects(setUserActive(actorId, true, inactiveActor.id), forbidden)
    } finally {
      const ids = (await prisma.user.findMany({ where: { email: { startsWith: marker } }, select: { id: true } })).map(
        (row) => row.id,
      )
      await prisma.eventType.deleteMany({ where: { createdBy: { in: ids } } })
      await prisma.user.deleteMany({ where: { id: { in: ids } } })
      await prisma.$disconnect()
    }
  },
)
