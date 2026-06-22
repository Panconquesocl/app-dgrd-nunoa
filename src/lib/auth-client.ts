import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    // Refleja el admin plugin del servidor (gestión de roles, baneos, etc.).
    adminClient(),
  ],
})

export const { signIn, signOut, signUp, useSession } = authClient
