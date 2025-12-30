import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { driveApi } from '@/lib/drive/drive-client'
import { useSettings } from '@/contexts/SettingsContext'
import { 
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { FileText, Plus, RefreshCw, Folder, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function Sidebar() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { setOpenMobile } = useSidebar()
  
  const { data: files, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['drive-files', settings.driveFolderId],
    queryFn: () => settings.driveFolderId ? driveApi.listFiles(settings.driveFolderId) : Promise.resolve([]),
    enabled: !!settings.driveFolderId,
  })

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      setDeletingId(id)
      try {
        await driveApi.deleteFile(id)
        queryClient.invalidateQueries({ queryKey: ['drive-files'] })
        navigate({ to: '/editor', search: {} })
      } catch (err) {
        console.error('Delete failed', err)
      } finally {
        setDeletingId(null)
      }
    }
  }

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Folder className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {settings.driveFolderName || 'No Folder'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Drive Folder
                </span>
              </div>
            </SidebarMenuButton>
            <SidebarMenuAction 
              onClick={() => refetch()}
              className={isFetching ? 'animate-spin' : ''}
              title="Refresh files"
            >
              <RefreshCw className="size-4" />
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* New Document Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    navigate({ to: '/editor', search: {} })
                    setOpenMobile(false)
                  }}
                  tooltip="New Document"
                >
                  <Plus className="size-4" />
                  <span>New Document</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* File List */}
              {isLoading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuButton className="animate-pulse">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="h-4 bg-muted rounded w-full" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              ) : files?.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-2 py-4 text-xs text-muted-foreground text-center italic">
                    No markdown files
                  </div>
                </SidebarMenuItem>
              ) : (
                files?.map(file => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton 
                      asChild
                      tooltip={file.name.replace('.md', '')}
                      isActive={window.location.search.includes(file.id)}
                    >
                      <Link
                        to="/editor"
                        search={{ fileId: file.id }}
                        onClick={() => setOpenMobile(false)}
                      >
                        <FileText className="size-4" />
                        <span className="truncate">{file.name.replace('.md', '')}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      disabled={deletingId === file.id}
                      onClick={(e) => handleDelete(e, file.id, file.name)}
                      className={deletingId === file.id ? 'animate-pulse' : ''}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link 
                to="/setup" 
                onClick={() => setOpenMobile(false)}
              >
                <Folder className="size-4" />
                <span>Change Folder</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Rail for hover-to-expand when collapsed */}
      <SidebarRail />
    </ShadcnSidebar>
  )
}
