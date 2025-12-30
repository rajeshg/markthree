import { z } from "zod";
import { useEditor } from "@/hooks/useEditor";
import { driveApi } from "@/lib/drive/drive-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Save,
  FileText,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from "lucide-react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { cn } from "@/lib/utils";

// FileViewer component for non-markdown files
function FileViewer({ fileData, fileId }: { fileData: any; fileId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileData && fileId) {
      setLoading(true);
      setError(null);

      driveApi
        .getFileBlob(fileId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        })
        .catch((err) => {
          console.error("Failed to load file blob:", err);
          setError("Failed to load file");
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileData, fileId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-github-blue" size={32} />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-lg">
            ⚠️ {error || "Failed to load file"}
          </div>
          <button
            onClick={() =>
              window.open(
                `https://drive.google.com/file/d/${fileId}/view`,
                "_blank",
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-github-blue text-white rounded hover:bg-github-blue/80 transition-colors"
          >
            <ExternalLink size={16} />
            Open in Google Drive
          </button>
        </div>
      </div>
    );
  }

  const { metadata } = fileData;
  const mimeType = metadata.mimeType;

  // Handle different file types
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        {/* Top Bar for viewer */}
        <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon size={16} />
            <span>{metadata.name}</span>
            <ChevronRight size={14} />
            <span className="text-xs opacity-50">File Viewer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.open(blobUrl, "_blank")}
              className="flex items-center gap-2 px-3 py-1 text-xs font-bold bg-github-blue hover:bg-github-blue/80 text-white rounded transition-colors"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        </div>

        {/* Image Viewer */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
          <img
            src={blobUrl}
            alt={metadata.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            style={{ maxWidth: "95vw", maxHeight: "80vh" }}
          />
        </div>
      </div>
    );
  }

  // For other file types, show download option
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Top Bar for viewer */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText size={16} />
          <span>{metadata.name}</span>
          <ChevronRight size={14} />
          <span className="text-xs opacity-50">File Viewer</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.open(blobUrl, "_blank")}
            className="flex items-center gap-2 px-3 py-1 text-xs font-bold bg-github-blue hover:bg-github-blue/80 text-white rounded transition-colors"
          >
            <Download size={14} />
            Download
          </button>
          <button
            onClick={() =>
              window.open(
                `https://drive.google.com/file/d/${fileId}/view`,
                "_blank",
              )
            }
            className="flex items-center gap-2 px-3 py-1 text-xs font-bold border border-github-blue text-github-blue hover:bg-github-blue hover:text-white rounded transition-colors"
          >
            <ExternalLink size={14} />
            Open in Drive
          </button>
        </div>
      </div>

      {/* File info */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="text-center space-y-4 max-w-md">
          <FileText size={64} className="mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">{metadata.name}</h3>
            <p className="text-sm text-muted-foreground">{mimeType}</p>
            <p className="text-xs text-muted-foreground mt-2">
              File size:{" "}
              {metadata.size
                ? `${(metadata.size / 1024).toFixed(1)} KB`
                : "Unknown"}
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.open(blobUrl, "_blank")}
              className="flex items-center gap-2 px-4 py-2 bg-github-blue text-white rounded hover:bg-github-blue/80 transition-colors w-full justify-center"
            >
              <Download size={16} />
              Download File
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://drive.google.com/file/d/${fileId}/view`,
                  "_blank",
                )
              }
              className="flex items-center gap-2 px-4 py-2 border border-github-blue text-github-blue rounded hover:bg-github-blue hover:text-white transition-colors w-full justify-center"
            >
              <ExternalLink size={16} />
              Open in Google Drive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/editor")({
  validateSearch: (search) =>
    z
      .object({
        fileId: z.string().optional(),
      })
      .parse(search),
  component: EditorPage,
});

function EditorPage() {
  const searchParams = Route.useSearch();
  const { fileId: queryFileId } = searchParams;
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [fileId, setFileId] = useState<string | null>(queryFileId || null);
  const [fileName, setFileName] = useState("Untitled");
  const lastLoadedFileIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const {
    state,
    updateBlock,
    addBlock,
    moveBlock,
    getMarkdown,
    resetEditor,
    setActiveBlock,
  } = useEditor("");
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync state with query param and handle redirection for last open doc
  useEffect(() => {
    if (queryFileId) {
      setFileId(queryFileId);
      localStorage.setItem("markthree_last_file_id", queryFileId);
    } else if (isInitialLoadRef.current) {
      const lastFileId = localStorage.getItem("markthree_last_file_id");
      if (lastFileId) {
        navigate({
          to: "/editor",
          search: { fileId: lastFileId },
          replace: true,
        });
      }
      isInitialLoadRef.current = false;
    } else {
      setFileId(null);
    }
  }, [queryFileId, navigate]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!settings.driveFolderId) return;
      setSaving(true);
      try {
        const driveFile = await driveApi.uploadImage(
          file,
          settings.driveFolderId,
        );

        const targetBlockId =
          state.activeBlockId || state.blocks[state.blocks.length - 1]?.id;

        addBlock("image", targetBlockId, {
          content: file.name,
          metadata: { src: driveFile.id },
        });
      } catch (err) {
        console.error("[Editor] Image upload failed", err);
      } finally {
        setSaving(false);
      }
    },
    [settings.driveFolderId, state.activeBlockId, state.blocks, addBlock],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    for (const file of imageFiles) {
      await handleImageUpload(file);
    }
  };

  // Memoized line number offsets
  const lineOffsets = useMemo(() => {
    let currentLine = 1;
    return state.blocks.map((block) => {
      const offset = currentLine;
      // Estimate lines: content lines + 1. Real wrap detection is complex,
      // but this is a good "Code Editor" approximation.
      const lines = block.content.split("\n").length;
      currentLine += lines;
      return offset;
    });
  }, [state.blocks]);

  // Fetch file metadata and content
  const {
    data: fileData,
    isLoading: isLoadingContent,
    isSuccess,
    error: fetchError,
  } = useQuery({
    queryKey: ["file", fileId],
    queryFn: async () => {
      if (!fileId) {
        return null;
      }
      try {
        const metadata = await driveApi.getFileMetadata(fileId);

        // For markdown files, fetch content
        if (metadata.name.toLowerCase().endsWith(".md")) {
          const content = await driveApi.getFileContent(fileId);
          return { metadata, content, isMarkdown: true };
        } else {
          // For other files, just return metadata - we'll fetch blob when needed
          return { metadata, content: "", isMarkdown: false };
        }
      } catch (err) {
        console.error("[Editor] Fetch error:", err);
        throw err;
      }
    },
    enabled: !!fileId,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors (401/403) - redirect will happen
      if (
        error?.message?.includes("Authentication expired") ||
        error?.message?.includes("Not authenticated")
      ) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });

  // Handle case where remembered file is missing/deleted
  useEffect(() => {
    if (fetchError) {
      console.warn("[Editor] File not found or inaccessible, clearing last doc.");
      localStorage.removeItem("markthree_last_file_id");
      navigate({ to: "/editor", search: {}, replace: true });
    }
  }, [fetchError, navigate]);

  // Load content into editor when data arrives
  useEffect(() => {
    if (fileData) {
      const needsLoad = lastLoadedFileIdRef.current !== fileId;
      if (needsLoad) {
        if (fileData.isMarkdown) {
          resetEditor(fileData.content || "");
          setFileName(fileData.metadata.name.replace(".md", ""));

          // Focus the end of the file on open
          setTimeout(() => {
            const lastBlock = state.blocks[state.blocks.length - 1];
            if (lastBlock) {
              setActiveBlock(lastBlock.id);
            }
          }, 50);
        }
        lastLoadedFileIdRef.current = fileId;
      }
    } else {
      resetEditor("");
      lastLoadedFileIdRef.current = null;
    }
  }, [fileData, fileId, isSuccess, resetEditor, setActiveBlock, state.blocks.length]);

  // Auto-focus new blocks and scroll into view
  useEffect(() => {
    if (state.activeBlockId) {
      const el = document.getElementById(
        `block-${state.activeBlockId}`,
      ) as HTMLTextAreaElement;
      if (el) {
        if (document.activeElement !== el) {
          el.focus();
        }
        // Ensure the block is visible, especially when keyboard pops up
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [state.activeBlockId]);

  const handleSave = useCallback(async () => {
    if (!settings.driveFolderId || !fileId) return;
    setSaving(true);
    try {
      const content = getMarkdown();

      // If filename changed, rename on Drive too
      if (
        fileData &&
        fileName !== fileData.metadata.name.replace(".md", "")
      ) {
        await driveApi.renameFile(fileId, `${fileName}.md`);
      }

      await driveApi.updateFile(fileId, content);
      
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });
      queryClient.invalidateQueries({ queryKey: ["file", fileId] });
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  }, [settings.driveFolderId, fileId, getMarkdown, fileData, fileName, queryClient]);

  // Auto-save logic
  useEffect(() => {
    if (!state.isDirty || !fileId || saving) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => clearTimeout(timer);
  }, [state.isDirty, fileId, handleSave, saving]);

  if (!fileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative mx-auto w-24 h-24 bg-github-blue/10 rounded-full flex items-center justify-center">
            <FileText size={48} className="text-github-blue" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background border-2 border-github-blue/20 rounded-full flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">No file selected</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Select a markdown file from the sidebar to start editing, or
              create a new one to get started with your ideas.
            </p>
          </div>
          <button
            onClick={() => addBlock("p")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-github-blue hover:bg-github-blue/80 text-white rounded-lg font-bold transition-all shadow-lg shadow-github-blue/20 hover:scale-105 active:scale-95"
          >
            Create New Document
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingContent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-github-blue" size={32} />
      </div>
    );
  }

  // Check if we have file data and if it's markdown
  const isMarkdownFile = fileData?.isMarkdown ?? true;

  return (
    <div
      className={cn(
        "flex-1 flex flex-col bg-background font-mono overflow-hidden transition-colors duration-200",
        isDragging && isMarkdownFile && "bg-github-blue/10",
      )}
      onDragOver={isMarkdownFile ? onDragOver : undefined}
      onDragLeave={isMarkdownFile ? onDragLeave : undefined}
      onDrop={isMarkdownFile ? onDrop : undefined}
    >
      {isDragging && isMarkdownFile && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-github-blue/20 backdrop-blur-sm pointer-events-none border-4 border-dashed border-github-blue m-4 rounded-xl">
          <div className="flex flex-col items-center gap-4 text-github-blue animate-bounce">
            <ImageIcon size={64} />
            <span className="text-xl font-bold uppercase tracking-widest">
              Drop Image to Upload
            </span>
          </div>
        </div>
      )}

      {isMarkdownFile ? (
        <>
          {/* Top Bar for Editor */}
          <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText size={16} />
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent border-none focus:ring-0 p-0 hover:text-github-blue cursor-text w-32"
              />
              <ChevronRight size={14} />
              <span className="text-xs opacity-50">
                {fileId ? "Synced to Drive" : "Local Only"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {state.isDirty && (
                <span className="text-[10px] text-github-yellow animate-pulse">
                  ● Unsaved Changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1 text-xs font-bold bg-github-blue hover:bg-github-blue/80 text-white rounded transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div
            className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-5xl mx-auto w-full space-y-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                // If clicking in the blank area, add a block at the end
                // or focus the last block if it's empty
                const lastBlock = state.blocks[state.blocks.length - 1];
                if (
                  lastBlock &&
                  lastBlock.content === "" &&
                  lastBlock.type === "p"
                ) {
                  setActiveBlock(lastBlock.id);
                } else {
                  addBlock("p", lastBlock?.id || null);
                }
              }
            }}
          >
            {state.blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                lineNumberOffset={lineOffsets[index]}
                showLineNumbers={settings.lineNumbers}
                isActive={state.activeBlockId === block.id}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                onFocus={() => setActiveBlock(block.id)}
                onMoveUp={() => moveBlock(block.id, "up")}
                onMoveDown={() => moveBlock(block.id, "down")}
                onKeyDown={(e) => {
                  // Block reordering with Alt + Arrow
                  if (
                    e.altKey &&
                    (e.key === "ArrowUp" || e.key === "ArrowDown")
                  ) {
                    e.preventDefault();
                    moveBlock(block.id, e.key === "ArrowUp" ? "up" : "down");
                    return;
                  }

                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // If it's a list or checkbox, continue the pattern
                    if (
                      ["ul", "ol", "checkbox"].includes(block.type) &&
                      block.content === ""
                    ) {
                      updateBlock(block.id, { type: "p" });
                    } else {
                      // If current is checkbox, new one starts as 'todo' status
                      const newType =
                        block.type === "ol" ||
                        block.type === "ul" ||
                        block.type === "checkbox"
                          ? block.type
                          : "p";
                      addBlock(newType, block.id);
                    }
                  }
                }}
              />
            ))}
          </div>
        </>
      ) : (
        /* File Viewer for non-markdown files */
        <FileViewer fileData={fileData} fileId={fileId!} />
      )}
    </div>
  );
}
