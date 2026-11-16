import { readdir } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import path from "node:path"

async function tests(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name)
      return entry.isDirectory()
        ? tests(file)
        : file.endsWith(".test.ts") && !file.endsWith(".integration.test.ts")
          ? [file]
          : []
    }),
  )
  return files.flat()
}
const files = [...(await tests("tests")), ...(await tests("src/features"))].sort()
const result = spawnSync(
  process.execPath,
  ["--experimental-test-module-mocks", "--import", "tsx", "--test", ...files],
  { stdio: "inherit" },
)
process.exitCode = result.status ?? 1
