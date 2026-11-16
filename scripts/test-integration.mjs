import { readFile, readdir } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { parse } from "dotenv"
import path from "node:path"

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl)
  throw new Error(
    "Define TEST_DATABASE_URL con una base exclusiva de pruebas. No se utiliza DATABASE_URL ni .env como fallback.",
  )
const target = new URL(testUrl)
if (!["postgres:", "postgresql:"].includes(target.protocol))
  throw new Error("TEST_DATABASE_URL debe ser una conexión PostgreSQL.")
const operational = await readFile(".env", "utf8")
  .then(parse)
  .catch(() => ({}))
function identity(value) {
  const url = new URL(value)
  const host = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ? "loopback"
    : url.hostname.replace("-pooler", "")
  return `${host}:${url.port || "5432"}${url.pathname}`
}
for (const value of [operational.DATABASE_URL, operational.DIRECT_URL].filter(Boolean)) {
  if (identity(value) === identity(testUrl))
    throw new Error("La base de pruebas coincide con la base operativa de .env. Usa una base separada.")
}
const directories = await readdir("src/features", { withFileTypes: true })
const files = (
  await Promise.all(
    directories
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const directory = path.join("src/features", entry.name)
        return (await readdir(directory))
          .filter((file) => file.endsWith(".integration.test.ts"))
          .map((file) => path.join(directory, file))
      }),
  )
)
  .flat()
  .sort()
const env = {
  ...process.env,
  DATABASE_URL: testUrl,
  DIRECT_URL: testUrl,
  BETTER_AUTH_URL: "http://localhost:3101",
  BETTER_AUTH_SECRET: `isolated-test-${randomUUID()}`,
  ALLOWED_EMAIL_DOMAIN: "nunoa.cl",
}
for (const file of files)
  for (const flag of (await readFile(file, "utf8")).matchAll(/RUN_[A-Z_]+_INTEGRATION/g)) env[flag[0]] = "1"
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run(["node_modules/prisma/build/index.js", "migrate", "deploy"])
run(["--import", "tsx", "--test", ...files])
