import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { driveApi } from "@/lib/drive/drive-client";
import { useSettings } from "@/contexts/SettingsContext";
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
} from "@/components/ui/sidebar";
import {
  FileText,
  Plus,
  RefreshCw,
  Folder,
  Trash2,
  Image,
  File,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";

// Helper function to get the appropriate icon for file types
function getFileIcon(mimeType: string, fileName: string) {
  if (mimeType === "application/vnd.google-apps.folder") {
    return Folder;
  }
  if (fileName.toLowerCase().endsWith(".md")) {
    return FileText;
  }
  if (mimeType.startsWith("image/")) {
    return Image;
  }
  return File;
}

export function Sidebar() {
  const { settings, navigateToFolder, navigateToParent, navigateToRoot } =
    useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { setOpenMobile } = useSidebar();

  // Use current folder or root drive folder
  const currentFolderId = settings.currentFolderId || settings.driveFolderId;
  const currentFolderName =
    settings.currentFolderName || settings.driveFolderName;

  const {
    data: files,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["drive-files", currentFolderId],
    queryFn: () =>
      currentFolderId
        ? driveApi.listFiles(currentFolderId)
        : Promise.resolve([]),
    enabled: !!currentFolderId,
  });

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      setDeletingId(id);
      try {
        await driveApi.deleteFile(id);
        queryClient.invalidateQueries({ queryKey: ["drive-files"] });
        navigate({ to: "/editor", search: {} });
      } catch (err) {
        console.error("Delete failed", err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          {/* Breadcrumb Navigation */}
          {(settings.folderPath?.length ?? 0) > 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={navigateToRoot}
                className="text-muted-foreground hover:text-foreground"
                tooltip="Go to root folder"
              >
                <Folder className="size-4" />
                <span className="truncate">
                  {settings.driveFolderName || "Root"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Current Folder */}
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Folder className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentFolderName || "No Folder"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Current Folder
                </span>
              </div>
            </SidebarMenuButton>
            {(settings.folderPath?.length ?? 0) > 0 && (
              <SidebarMenuAction
                onClick={navigateToParent}
                title="Go to parent folder"
              >
                <ArrowLeft className="size-4" />
              </SidebarMenuAction>
            )}
            <SidebarMenuAction
              onClick={() => refetch()}
              className={isFetching ? "animate-spin" : ""}
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
                    navigate({ to: "/editor", search: {} });
                    setOpenMobile(false);
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
                  {[1, 2, 3].map((i) => (
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
                    No files
                  </div>
                </SidebarMenuItem>
              ) : (
                files?.map((item) => {
                  const IconComponent = getFileIcon(item.mimeType, item.name);
                  const displayName = item.name.toLowerCase().endsWith(".md")
                    ? item.name.replace(".md", "")
                    : item.name;
                  const isFolder =
                    item.mimeType === "application/vnd.google-apps.folder";

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild={!isFolder}
                        tooltip={displayName}
                        isActive={
                          !isFolder && window.location.search.includes(item.id)
                        }
                        onClick={
                          isFolder
                            ? () => {
                                navigateToFolder(item.id, item.name);
                                setOpenMobile(false);
                              }
                            : undefined
                        }
                      >
                        {isFolder ? (
                          <div className="flex items-center gap-2 cursor-pointer">
                            <IconComponent className="size-4" />
                            <span className="truncate">{displayName}</span>
                          </div>
                        ) : (
                          <Link
                            to="/editor"
                            search={{ fileId: item.id }}
                            onClick={() => setOpenMobile(false)}
                          >
                            <IconComponent className="size-4" />
                            <span className="truncate">{displayName}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                      {!isFolder && (
                        <SidebarMenuAction
                          showOnHover
                          disabled={deletingId === item.id}
                          onClick={(e) => handleDelete(e, item.id, item.name)}
                          className={
                            deletingId === item.id ? "animate-pulse" : ""
                          }
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </SidebarMenuAction>
                      )}
                    </SidebarMenuItem>
                  );
                })
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
              <Link to="/setup" onClick={() => setOpenMobile(false)}>
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
  );
}
