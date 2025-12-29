import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // Since we're using the same domain, we don't need to specify baseURL
})

export const { signIn, signOut, useSession } = authClient
