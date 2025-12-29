import { auth } from '@/lib/auth/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import Database from 'better-sqlite3'

export const getDriveToken = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    if (!request) return null

    const session = await auth.api.getSession({
        headers: request.headers
    })

    if (!session) return null

    // Better-Auth API filters out accessToken. We'll fetch it directly from the DB.
    // Since we are in a server function, we can access the same SQLite database.
    try {
      const db = new Database('./sqlite.db')
      const account = db.prepare('SELECT accessToken FROM account WHERE userId = ? AND providerId = ?').get(session.user.id, 'google') as { accessToken: string } | undefined
      db.close()
      
      return account?.accessToken || null
    } catch (err) {
      console.error('DEBUG: Direct DB access failed', err)
      return null
    }
  })
