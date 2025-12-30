import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { driveApi } from "@/lib/drive/drive-client";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Plus,
  RefreshCw,
  Folder,
  Trash2,
  Image,
  File,
  ChevronRight,
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
  const { settings } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const { setOpenMobile } = useSidebar();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

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
    name: string
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

  const handleCreateNewDocument = async () => {
    if (!settings.driveFolderId) {
      console.error("No Drive folder configured");
      return;
    }

    setCreatingNew(true);
    try {
      // Create a new untitled markdown file
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const fileName = `Untitled ${timestamp}.md`;
      const initialContent = "# Untitled\n\n";

      const newFile = await driveApi.createFile(
        fileName,
        initialContent,
        settings.driveFolderId
      );

      // Invalidate the file list cache
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });

      // Navigate to the new file
      navigate({ to: "/editor", search: { fileId: newFile.id } });
      setOpenMobile(false);
    } catch (err) {
      console.error("Failed to create new document:", err);
      alert("Failed to create new document. Please try again.");
    } finally {
      setCreatingNew(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Component to render folder with its contents (recursive)
  const FolderItem = ({
    folder,
    level = 0,
  }: {
    folder: any;
    level?: number;
  }) => {
    const isExpanded = expandedFolders.has(folder.id);

    // Query for folder contents
    const { data: folderContents, isLoading: isFolderLoading } = useQuery({
      queryKey: ["drive-files", folder.id],
      queryFn: () => driveApi.listFiles(folder.id),
      enabled: isExpanded,
    });

    const folderDisplayName = folder.name;

    // For nested folders (level > 0), render as sub-item to maintain indentation
    if (level > 0) {
      return (
        <Collapsible
          open={isExpanded}
          onOpenChange={() => toggleFolder(folder.id)}
        >
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton>
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
                <Folder className="size-4" />
                <span className="truncate">{folderDisplayName}</span>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 flex flex-col gap-1">
                {isFolderLoading ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Loading...
                  </div>
                ) : folderContents?.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground italic">
                    Empty folder
                  </div>
                ) : (
                  folderContents?.map((item) => {
                    const IconComponent = getFileIcon(item.mimeType, item.name);
                    const displayName = item.name.toLowerCase().endsWith(".md")
                      ? item.name.replace(".md", "")
                      : item.name;
                    const isFolder =
                      item.mimeType === "application/vnd.google-apps.folder";

                    if (isFolder) {
                      return (
                        <FolderItem key={item.id} folder={item} level={level + 1} />
                      );
                    }

                    return (
                      <SidebarMenuSubButton
                        key={item.id}
                        asChild
                        isActive={window.location.search.includes(item.id)}
                      >
                        <Link
                          to="/editor"
                          search={{ fileId: item.id }}
                          onClick={() => setOpenMobile(false)}
                        >
                          <IconComponent className="size-4" />
                          <span className="truncate">{displayName}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    );
                  })
                )}
              </div>
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
      );
    }

    // For top-level folders (level 0), render as menu item
    return (
      <Collapsible
        open={isExpanded}
        onOpenChange={() => toggleFolder(folder.id)}
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={folderDisplayName}>
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
              <Folder className="size-4" />
              <span className="truncate">{folderDisplayName}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {isFolderLoading ? (
                <SidebarMenuSubItem>
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Loading...
                  </div>
                </SidebarMenuSubItem>
              ) : folderContents?.length === 0 ? (
                <SidebarMenuSubItem>
                  <div className="px-2 py-1 text-xs text-muted-foreground italic">
                    Empty folder
                  </div>
                </SidebarMenuSubItem>
              ) : (
                folderContents?.map((item) => {
                  const IconComponent = getFileIcon(item.mimeType, item.name);
                  const displayName = item.name.toLowerCase().endsWith(".md")
                    ? item.name.replace(".md", "")
                    : item.name;
                  const isFolder =
                    item.mimeType === "application/vnd.google-apps.folder";

                  if (isFolder) {
                    // Recursive folder rendering with increased level
                    return <FolderItem key={item.id} folder={item} level={level + 1} />;
                  }

                  return (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={window.location.search.includes(item.id)}
                      >
                        <Link
                          to="/editor"
                          search={{ fileId: item.id }}
                          onClick={() => setOpenMobile(false)}
                        >
                          <IconComponent className="size-4" />
                          <span className="truncate">{displayName}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
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
                  Drive Folder
                </span>
              </div>
            </SidebarMenuButton>
            {/* Action buttons wrapper */}
            <div className="absolute top-1.5 right-1 flex items-center gap-1">
              <button
                onClick={() => refetch()}
                title="Refresh files"
                className={cn(
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-colors",
                  isFetching && "animate-spin"
                )}
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
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
                  onClick={handleCreateNewDocument}
                  disabled={creatingNew}
                  tooltip="Create New Document"
                >
                  {creatingNew ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span>{creatingNew ? "Creating..." : "New Document"}</span>
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

                  if (isFolder) {
                    return <FolderItem key={item.id} folder={item} />;
                  }

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={displayName}
                        isActive={window.location.search.includes(item.id)}
                      >
                        <Link
                          to="/editor"
                          search={{ fileId: item.id }}
                          onClick={() => setOpenMobile(false)}
                        >
                          <IconComponent className="size-4" />
                          <span className="truncate">{displayName}</span>
                        </Link>
                      </SidebarMenuButton>
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
