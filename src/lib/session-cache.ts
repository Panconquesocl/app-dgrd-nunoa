import type { QueryClient } from "@tanstack/react-query"

/** Cancela respuestas pendientes antes de vaciar los datos de la cuenta que sale. */
export async function clearSessionCache(client: QueryClient) {
  await client.cancelQueries()
  client.clear()
}
