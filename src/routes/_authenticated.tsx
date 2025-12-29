import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth/auth-client'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({
        to: '/',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})
