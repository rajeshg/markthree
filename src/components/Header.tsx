import { useNavigate } from '@tanstack/react-router'
import { LogOut, FileText } from 'lucide-react'
import { signIn, signOut, useSession } from '@/lib/auth/auth-client'
import { SidebarTrigger } from '@/components/ui/sidebar'

export default function Header() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  const handleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/editor',
    })
  }

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: '/' })
        },
      },
    })
  }

  return (
    <header className="h-14 px-4 flex items-center justify-between bg-card border-b border-border shrink-0">
      {/* Left side: Sidebar Trigger + Logo/Brand */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-github-blue" />
          <h1 className="text-base font-bold tracking-tight">
            MarkThree
          </h1>
        </div>
      </div>

      {/* User Section */}
      <div className="flex items-center gap-3">
        {isPending ? (
          <div className="h-8 w-20 animate-pulse bg-muted rounded" />
        ) : session ? (
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-github-blue/10 flex items-center justify-center text-github-blue font-bold text-xs">
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-muted-foreground max-w-[150px] truncate">
                {session.user.email}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-github-blue hover:bg-github-blue/90 rounded text-sm font-medium transition-colors text-white"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}
