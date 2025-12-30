import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FolderPlus, FolderOpen, Check } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { driveApi } from '@/lib/drive/drive-client'

export const Route = createFileRoute('/_authenticated/setup')({
  component: SetupComponent,
})

function SetupComponent() {
  const { updateSettings } = useSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleCreateFolder = async () => {
    setLoading(true)
    setError(null)
    try {
      const folder = await driveApi.createFolder('MarkThree Documents')
      updateSettings({
        driveFolderId: folder.id,
        driveFolderName: folder.name,
      })
      navigate({ to: '/editor' })
    } catch (err: any) {
      setError(err.message || 'Failed to create folder')
    } finally {
      setLoading(false)
    }
  }

  const handlePickFolder = async () => {
    // This will eventually use the Google Drive Picker API
    // For now, we'll just show the error that it's not implemented
    setError('Drive Picker integration coming soon. Please use "Create Default Folder" for now.')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-8 p-8 border border-border bg-card rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-github-blue">Storage Setup</h2>
          <p className="mt-2 text-muted-foreground">
            MarkThree stores your markdown files directly in your Google Drive.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleCreateFolder}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border border-border hover:border-github-blue hover:bg-accent/50 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <FolderPlus className="text-github-blue" size={24} />
              <div className="text-left">
                <div className="font-bold">Use Default Folder</div>
                <div className="text-xs text-muted-foreground">Reuses or creates "MarkThree Documents" in your Drive</div>
              </div>
            </div>
            <Check className="opacity-0 group-hover:opacity-100 text-github-blue transition-opacity" size={20} />
          </button>

          <button
            onClick={handlePickFolder}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border border-border hover:border-github-blue hover:bg-accent/50 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <FolderOpen className="text-github-blue" size={24} />
              <div className="text-left">
                <div className="font-bold">Choose Existing Folder</div>
                <div className="text-xs text-muted-foreground">Select a folder from your Google Drive</div>
              </div>
            </div>
            <Check className="opacity-0 group-hover:opacity-100 text-github-blue transition-opacity" size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-github-red/10 border border-github-red/50 text-github-red text-sm rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            Communicating with Google Drive...
          </div>
        ) }
      </div>
    </div>
  )
}
