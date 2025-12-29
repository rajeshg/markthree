import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { useSettings } from '@/contexts/SettingsContext'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const { data: session, isPending } = authClient.useSession()
  const { settings } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && session) {
      if (!settings.driveFolderId) {
        navigate({ to: '/setup' })
      } else {
        navigate({ to: '/editor' })
      }
    }
  }, [session, isPending, settings.driveFolderId, navigate])

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-background">
      <h1 className="text-5xl font-bold tracking-tighter text-github-blue">
        MarkThree <span className="text-github-fg/50">v2</span>
      </h1>
      <p className="max-w-[600px] text-muted-foreground text-lg">
        A minimalist markdown editor that syncs directly to your Google Drive. 
        GitHub aesthetic, terminal speed, your data.
      </p>
      
      {!session && !isPending && (
        <div className="pt-8">
          <p className="text-sm text-muted-foreground mb-4">Sign in to get started</p>
          <button
            onClick={() => authClient.signIn.social({ provider: 'google' })}
            className="px-8 py-3 bg-github-blue hover:bg-github-blue/90 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Connect Google Drive
          </button>
        </div>
      )}

      {isPending && (
        <div className="pt-8 animate-pulse text-muted-foreground">
          Checking session...
        </div>
      )}
    </div>
  )
}

