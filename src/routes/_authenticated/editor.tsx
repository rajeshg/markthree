import { z } from "zod";
import { useEditor } from "@/hooks/useEditor";
import { driveApi } from "@/lib/drive/drive-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Use TanStack Query to fetch and cache the blob
  const {
    data: blobUrl,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["file-blob", fileId],
    queryFn: async () => {
      const blob = await driveApi.getFileBlob(fileId);

      if (blob.size === 0) {
        throw new Error("Blob is empty");
      }

      // Check if blob is actually an image by reading the first few bytes (magic numbers)
      const header = await blob.slice(0, 4).arrayBuffer();
      const headerBytes = new Uint8Array(header);

      // PNG: 89 50 4E 47
      // JPEG: FF D8 FF
      // GIF: 47 49 46
      const isPNG = headerBytes[0] === 0x89 && headerBytes[1] === 0x50;
      const isJPEG = headerBytes[0] === 0xff && headerBytes[1] === 0xd8;
      const isGIF = headerBytes[0] === 0x47 && headerBytes[1] === 0x49;

      if (!isPNG && !isJPEG && !isGIF) {
        throw new Error("Invalid image data received from Drive API");
      }

      // Force the correct MIME type when creating the blob URL
      const correctMimeType = isPNG ? "image/png" : isJPEG ? "image/jpeg" : "image/gif";
      const typedBlob = new Blob([blob], { type: correctMimeType });

      const url = URL.createObjectURL(typedBlob);
      return url;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  });

  // Cleanup blob URL when query is garbage collected or component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        // Remove from cache to force refetch next time
        queryClient.removeQueries({ queryKey: ["file-blob", fileId] });
      }
    };
  }, [blobUrl, fileId, queryClient]);

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
          <div className="text-red-500 text-lg">⚠️ {error?.message || "Failed to load file"}</div>
          <button
            onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")}
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
            style={{
              maxWidth: "95vw",
              maxHeight: "80vh",
            }}
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
            onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")}
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
              File size: {metadata.size ? `${(metadata.size / 1024).toFixed(1)} KB` : "Unknown"}
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
                window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")
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

const searchSchema = z.object({
  fileId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/editor")({
  validateSearch: searchSchema,

  beforeLoad: async ({ search }) => {
    // If no fileId in URL, check for last opened file and redirect
    if (!search.fileId && typeof window !== "undefined") {
      const lastFileId = localStorage.getItem("markthree_last_file_id");
      if (lastFileId) {
        throw redirect({
          to: "/editor",
          search: { fileId: lastFileId },
          replace: true,
        });
      }
    }
  },

  loaderDeps: ({ search }) => ({ fileId: search.fileId }),

  loader: async ({ context, deps }) => {
    const fileId = deps.fileId;

    if (!fileId) {
      return { fileData: null };
    }

    try {
      // Use queryClient to fetch with caching
      const fileData = await context.queryClient.ensureQueryData({
        queryKey: ["file", fileId],
        queryFn: async () => {
          const metadata = await driveApi.getFileMetadata(fileId);

          // Simple check: if filename ends with .md, it's markdown
          if (metadata.name.toLowerCase().endsWith(".md")) {
            const content = await driveApi.getFileContent(fileId);
            return { metadata, content, isMarkdown: true };
          }

          // Otherwise, it's a binary file (image, etc)
          return { metadata, content: "", isMarkdown: false };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });

      // Store last opened file
      if (typeof window !== "undefined") {
        localStorage.setItem("markthree_last_file_id", fileId);
      }

      return { fileData };
    } catch (err) {
      console.error("[Loader] Failed to load file:", err);

      // If file not found, clear from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("markthree_last_file_id");
      }

      throw redirect({
        to: "/editor",
        search: {},
        replace: true,
      });
    }
  },

  component: EditorPage,
});

function EditorPage() {
  const searchParams = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const fileId = searchParams.fileId ?? null; // Use fileId directly from URL, convert undefined to null
  const { fileData } = loaderData;
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("Untitled");
  const shouldFocusLastBlockRef = useRef<string | null>(null);

  const {
    state,
    updateBlock,
    addBlock,
    removeBlock,
    moveBlock,
    mergeWithPrevious,
    getMarkdown,
    resetEditor,
    markAsSaved,
    setActiveBlock,
  } = useEditor("");

  // Explicit save function that takes fileId, isMarkdown, and content as parameters
  const saveFile = useCallback(
    async (targetFileId: string, targetFileName: string, isMarkdown: boolean, content: string) => {
      if (!settings.driveFolderId) {
        throw new Error("No Drive folder configured");
      }

      // Safety check: Only save markdown files
      if (!isMarkdown || !targetFileName.toLowerCase().endsWith(".md")) {
        console.error("[Editor] Refusing to save non-markdown file:", targetFileName);
        throw new Error("Cannot save non-markdown file");
      }

      // Safety check: Content must not be empty
      if (!content || content.trim() === "") {
        console.error("[Editor] Refusing to save empty content");
        throw new Error("Cannot save empty content");
      }

      console.log("[Editor] Saving file:", targetFileId, targetFileName, "Length:", content.length);

      try {
        await driveApi.updateFile(targetFileId, content);
        console.log("[Editor] ✓ Save completed successfully:", targetFileId);
      } catch (error) {
        console.error("[Editor] ✗ Save failed:", error);
        throw error; // Re-throw to let caller handle
      }

      // Invalidate queries in background (non-blocking)
      console.log("[Editor] Invalidating queries...");
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drive-files"] }),
        queryClient.invalidateQueries({ queryKey: ["file", targetFileId] }),
      ])
        .then(() => {
          console.log("[Editor] Queries invalidated successfully");
        })
        .catch((err) => {
          console.error("[Editor] Query invalidation failed:", err);
        });
    },
    [settings.driveFolderId, queryClient],
  );
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!settings.driveFolderId) return;
      setSaving(true);
      try {
        const driveFile = await driveApi.uploadImage(file, settings.driveFolderId);

        const targetBlockId = state.activeBlockId || state.blocks[state.blocks.length - 1]?.id;

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

  // Keep track of the currently loaded file info to know what to save
  const [currentLoadedFile, setCurrentLoadedFile] = useState<{
    fileId: string;
    fileName: string;
    isMarkdown: boolean;
  } | null>(null);

  const previousFileIdRef = useRef<string | null>(null);

  // Load content into editor when data arrives from loader
  useEffect(() => {
    const newFileId = searchParams.fileId;
    const previousFileId = previousFileIdRef.current;

    // Skip if we're already on this file
    if (previousFileId === newFileId) {
      return;
    }

    // Auto-save before switching (fire-and-forget)
    // Capture current state at the moment of file switch
    const fileToSave = currentLoadedFile;
    const isDirty = state.isDirty;

    if (fileToSave && previousFileId && isDirty) {
      const content = getMarkdown();
      saveFile(fileToSave.fileId, fileToSave.fileName, fileToSave.isMarkdown, content).catch(
        (err) => {
          console.error("[Editor] Failed to auto-save before switch:", err);
        },
      );
    }

    // Load the new file
    if (fileData) {
      if (fileData.isMarkdown) {
        resetEditor(fileData.content || "", { focusLast: true });
        setFileName(fileData.metadata.name.replace(".md", ""));

        // Update current loaded file info
        setCurrentLoadedFile({
          fileId: newFileId!,
          fileName: fileData.metadata.name,
          isMarkdown: true,
        });
      } else {
        // Non-markdown file
        setCurrentLoadedFile({
          fileId: newFileId!,
          fileName: fileData.metadata.name,
          isMarkdown: false,
        });
      }
    } else {
      // No file selected
      resetEditor("");
      setCurrentLoadedFile(null);
      shouldFocusLastBlockRef.current = null;
    }

    // Update the ref for next time
    previousFileIdRef.current = newFileId ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData, searchParams.fileId]);

  // Update the shouldFocusLastBlockRef when blocks change after reset
  useEffect(() => {
    if (state.blocks.length > 0 && state.activeBlockId) {
      const lastBlock = state.blocks[state.blocks.length - 1];
      if (lastBlock.id === state.activeBlockId) {
        shouldFocusLastBlockRef.current = lastBlock.id;
      }
    }
  }, [state.blocks, state.activeBlockId]);

  // Auto-focus active block and scroll into view (only for user interactions, not initial load)
  useEffect(() => {
    if (state.activeBlockId && !shouldFocusLastBlockRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const el = document.getElementById(`block-${state.activeBlockId}`) as HTMLTextAreaElement;
        if (el) {
          if (document.activeElement !== el) {
            el.focus();
            // Position cursor at the end of the content
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
          // Instant scroll for snappiness
          el.scrollIntoView({ behavior: "instant", block: "center" });
        }
      });
    }
  }, [state.activeBlockId]);

  const handleSave = useCallback(async () => {
    if (!currentLoadedFile) return;

    console.log("[handleSave] Starting save, setting saving=true");
    setSaving(true);
    try {
      const content = getMarkdown();

      // Use explicit save function with current file info
      await saveFile(
        currentLoadedFile.fileId,
        fileName + ".md", // Use current fileName from state (may have been edited)
        currentLoadedFile.isMarkdown,
        content,
      );

      // Mark editor as saved
      markAsSaved();

      // If filename changed, rename on Drive too
      const originalFileName = currentLoadedFile.fileName.replace(".md", "");
      if (fileName !== originalFileName) {
        console.log("[handleSave] Filename changed, renaming:", originalFileName, "→", fileName);
        await driveApi.renameFile(currentLoadedFile.fileId, `${fileName}.md`);
        // Update our tracking
        setCurrentLoadedFile({
          ...currentLoadedFile,
          fileName: `${fileName}.md`,
        });
      }
      console.log("[handleSave] Save completed successfully");
    } catch (err) {
      console.error("[handleSave] Save failed", err);
    } finally {
      console.log("[handleSave] Finally block - setting saving=false");
      setSaving(false);
    }
  }, [currentLoadedFile, fileName, getMarkdown, saveFile, markAsSaved]);

  // Auto-save logic (only for markdown files)
  // Use a ref to track if we're currently saving to avoid dependency issues
  const savingRef = useRef(false);

  useEffect(() => {
    // Skip if not dirty, not markdown, or already saving
    if (!state.isDirty || !currentLoadedFile?.isMarkdown || savingRef.current) {
      return;
    }

    console.log("[Auto-save] Scheduling auto-save in 3 seconds...");
    const timer = setTimeout(async () => {
      // Check again before saving (state might have changed)
      if (!state.isDirty || !currentLoadedFile?.isMarkdown || savingRef.current) {
        return;
      }

      console.log("[Auto-save] Triggering auto-save");
      savingRef.current = true;
      setSaving(true);

      try {
        const content = getMarkdown();
        await saveFile(
          currentLoadedFile.fileId,
          fileName + ".md",
          currentLoadedFile.isMarkdown,
          content,
        );

        // Mark editor as saved to stop the loop
        markAsSaved();

        // Handle filename changes
        const originalFileName = currentLoadedFile.fileName.replace(".md", "");
        if (fileName !== originalFileName) {
          console.log("[Auto-save] Filename changed, renaming");
          await driveApi.renameFile(currentLoadedFile.fileId, `${fileName}.md`);
          setCurrentLoadedFile({
            ...currentLoadedFile,
            fileName: `${fileName}.md`,
          });
        }
        console.log("[Auto-save] Completed");
      } catch (err) {
        console.error("[Auto-save] Failed", err);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [state.isDirty, currentLoadedFile?.fileId, currentLoadedFile?.isMarkdown]);

  if (!fileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="max-w-md space-y-6">
          <div className="relative mx-auto w-24 h-24 bg-github-blue/10 rounded-full flex items-center justify-center">
            <FileText size={48} className="text-github-blue" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background border-2 border-github-blue/20 rounded-full flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">No file selected</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Select a markdown file from the sidebar to start editing, or create a new one to get
              started with your ideas.
            </p>
          </div>
          <button
            onClick={() => addBlock("p")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-github-blue hover:bg-github-blue/80 text-white rounded-lg font-bold transition-colors shadow-lg shadow-github-blue/20"
          >
            Create New Document
          </button>
        </div>
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
              <span className="text-xs opacity-30 ml-2">[{state.blocks.length} blocks]</span>
            </div>
            <div className="flex items-center gap-4">
              {state.isDirty && (
                <span className="text-[10px] text-github-yellow animate-pulse">
                  ● Unsaved Changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !currentLoadedFile?.isMarkdown}
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
                if (lastBlock && lastBlock.content === "" && lastBlock.type === "p") {
                  setActiveBlock(lastBlock.id);
                } else {
                  addBlock("p", lastBlock?.id || null);
                }
              }
            }}
          >
            {state.blocks.length === 0 && (
              <div className="text-muted-foreground text-sm p-4">
                No blocks loaded. Click to add content.
              </div>
            )}
            {state.blocks.map((block, index) => {
              // Helper to determine if a block type should be grouped
              const isGroupableType = (type: string) =>
                type === "checkbox" || type === "code" || type === "blockquote";

              // Check if this is the first block in a group
              const prevBlock = index > 0 ? state.blocks[index - 1] : null;
              const isFirstInGroup =
                isGroupableType(block.type) && (!prevBlock || prevBlock.type !== block.type);

              // Check if this is the last block in a group
              const nextBlock = index < state.blocks.length - 1 ? state.blocks[index + 1] : null;
              const isLastInGroup =
                isGroupableType(block.type) && (!nextBlock || nextBlock.type !== block.type);

              return (
                <BlockEditor
                  key={block.id}
                  block={block}
                  lineNumberOffset={lineOffsets[index]}
                  showLineNumbers={settings.lineNumbers}
                  isActive={state.activeBlockId === block.id}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                  onFocus={() => setActiveBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, "up")}
                  onMoveDown={() => moveBlock(block.id, "down")}
                  onDelete={block.type === "image" ? () => removeBlock(block.id) : undefined}
                  onMount={(el) => {
                    // When the block mounts, check if it's the one we want to focus
                    if (shouldFocusLastBlockRef.current === block.id) {
                      shouldFocusLastBlockRef.current = null;
                      el.focus();
                      const len = el.value.length;
                      el.setSelectionRange(len, len);
                      el.scrollIntoView({ behavior: "instant", block: "center" });
                    }
                  }}
                  onKeyDown={(e) => {
                    const textarea = e.currentTarget;
                    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
                    const modKey = isMac ? e.metaKey : e.ctrlKey;

                    // Text formatting shortcuts
                    if (modKey && !e.altKey) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const selectedText = textarea.value.substring(start, end);

                      let wrapper = "";
                      let shouldHandle = true;

                      // Cmd+Shift combinations
                      if (e.shiftKey) {
                        switch (e.key.toLowerCase()) {
                          case "x": // Strikethrough
                            wrapper = "~~";
                            break;
                          case "c": // Inline code (Slack uses Cmd+Shift+C)
                            wrapper = "`";
                            break;
                          case "k": // Code block
                            e.preventDefault();
                            updateBlock(block.id, { type: "code" });
                            return;
                          default:
                            shouldHandle = false;
                        }
                      } else {
                        // Cmd combinations (without shift)
                        switch (e.key.toLowerCase()) {
                          case "b": // Bold (universal standard!)
                            wrapper = "**";
                            break;
                          case "i": // Italic
                            wrapper = "*";
                            break;
                          case "u": // Underline
                            wrapper = "__";
                            break;
                          case "e": // Code block (Notion style)
                            e.preventDefault();
                            updateBlock(block.id, { type: "code" });
                            return;
                          default:
                            shouldHandle = false;
                        }
                      }

                      if (shouldHandle && wrapper) {
                        e.preventDefault();

                        const before = textarea.value.substring(0, start);
                        const after = textarea.value.substring(end);

                        // Check if selection is already wrapped
                        const isWrapped = before.endsWith(wrapper) && after.startsWith(wrapper);

                        if (isWrapped) {
                          // Unwrap: remove wrapper
                          const newContent =
                            before.slice(0, -wrapper.length) +
                            selectedText +
                            after.slice(wrapper.length);
                          updateBlock(block.id, { content: newContent });

                          // Restore selection without wrapper
                          setTimeout(() => {
                            textarea.setSelectionRange(
                              start - wrapper.length,
                              end - wrapper.length,
                            );
                          }, 0);
                        } else {
                          // Wrap: add wrapper
                          const newContent = before + wrapper + selectedText + wrapper + after;
                          updateBlock(block.id, { content: newContent });

                          // Restore selection inside wrapper
                          setTimeout(() => {
                            textarea.setSelectionRange(
                              start + wrapper.length,
                              end + wrapper.length,
                            );
                          }, 0);
                        }
                        return;
                      }
                    }

                    // Block reordering with Alt + Arrow
                    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                      e.preventDefault();
                      moveBlock(block.id, e.key === "ArrowUp" ? "up" : "down");
                      return;
                    }

                    // Backspace at start of block
                    if (e.key === "Backspace") {
                      const textarea = e.currentTarget;
                      if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
                        e.preventDefault();

                        // For image blocks, delete the entire block if empty or at start
                        if (block.type === "image") {
                          removeBlock(block.id);
                        } else {
                          // For other blocks, merge with previous
                          mergeWithPrevious(block.id);
                        }
                        return;
                      }
                    }

                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      // If it's a list or checkbox, continue the pattern
                      if (["ul", "ol", "checkbox"].includes(block.type) && block.content === "") {
                        updateBlock(block.id, { type: "p" });
                      } else {
                        // If current is checkbox, new one starts as 'todo' status
                        const newType =
                          block.type === "ol" || block.type === "ul" || block.type === "checkbox"
                            ? block.type
                            : "p";
                        addBlock(newType, block.id);
                      }
                    }
                  }}
                />
              );
            })}
          </div>
        </>
      ) : (
        /* File Viewer for non-markdown files */
        <FileViewer fileData={fileData} fileId={fileId!} />
      )}
    </div>
  );
}
