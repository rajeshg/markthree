import React, { useRef, useEffect, useState, useMemo } from "react";
import { EditorBlock } from "@/types/editor";
import { cn } from "@/lib/utils";
import { driveApi } from "@/lib/drive/drive-client";
import { codeToHtml } from "shiki";
import { format } from "date-fns";

// Slash Command Types
interface SlashCommand {
  label: string;
  icon: string;
  type: string;
  description: string;
  action: () => void;
}

interface BlockEditorProps {
  block: EditorBlock;
  showLineNumbers: boolean;
  onUpdate: (updates: Partial<EditorBlock>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  isActive: boolean;
  lineNumberOffset: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onMount?: (element: HTMLTextAreaElement) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function BlockEditor({
  block,
  showLineNumbers,
  onUpdate,
  onKeyDown,
  onFocus,
  isActive,
  lineNumberOffset,
  onMoveUp,
  onMoveDown,
  onDelete,
  onMount,
  isFirstInGroup = false,
  isLastInGroup = false,
}: BlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);

  // Call onMount when textarea is first mounted
  useEffect(() => {
    if (textareaRef.current && onMount) {
      onMount(textareaRef.current);
    }
  }, [onMount]);

  const slashCommands: SlashCommand[] = useMemo(
    () => [
      {
        label: "H1 Header",
        icon: "H1",
        type: "h1",
        description: "Large section heading",
        action: () => onUpdate({ type: "h1", content: "" }),
      },
      {
        label: "H2 Header",
        icon: "H2",
        type: "h2",
        description: "Medium section heading",
        action: () => onUpdate({ type: "h2", content: "" }),
      },
      {
        label: "H3 Header",
        icon: "H3",
        type: "h3",
        description: "Small section heading",
        action: () => onUpdate({ type: "h3", content: "" }),
      },
      {
        label: "Task List",
        icon: "[ ]",
        type: "checkbox",
        description: "Track tasks with checkboxes",
        action: () =>
          onUpdate({
            type: "checkbox",
            content: "",
            metadata: { status: "todo" },
          }),
      },
      {
        label: "Code Block",
        icon: "</>",
        type: "code",
        description: "Syntax highlighted code",
        action: () => onUpdate({ type: "code", content: "" }),
      },
      {
        label: "Quote",
        icon: '"',
        type: "blockquote",
        description: "Capture a quotation",
        action: () => onUpdate({ type: "blockquote", content: "" }),
      },
      {
        label: "Divider",
        icon: "—",
        type: "hr",
        description: "Horizontal separator",
        action: () => onUpdate({ type: "hr", content: "" }),
      },
      {
        label: "Insert Today",
        icon: "📅",
        type: "today",
        description: "Current date",
        action: () => onUpdate({ content: format(new Date(), "MMM d, yyyy ") }),
      },
      {
        label: "Insert Now",
        icon: "⏰",
        type: "now",
        description: "Current time",
        action: () => onUpdate({ content: format(new Date(), "HH:mm ") }),
      },
    ],
    [onUpdate],
  );

  const filteredCommands = useMemo(() => {
    if (!block.content.startsWith("/")) return [];
    const query = block.content.slice(1).toLowerCase();
    return slashCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query),
    );
  }, [block.content, slashCommands]);

  // Reset menu index when content changes
  useEffect(() => {
    setSlashMenuIndex(0);
  }, [block.content]);

  // Handle keyboard navigation in slash menu
  const handleSlashKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenuIndex((i) => (i + 1) % filteredCommands.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashMenuIndex(
          (i) => (i - 1 + filteredCommands.length) % filteredCommands.length,
        );
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        filteredCommands[slashMenuIndex].action();
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onUpdate({ content: "" });
        return true;
      }
    }
    return false;
  };

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [block.content]);

  // Fetch image URL if it's an image block
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (block.type !== "image" || !block.metadata?.src) {
      setImgUrl(null);
      setImgError(block.type === "image" && !block.metadata?.src);
      return;
    }

    const src = block.metadata.src;
    setImgError(false);

    // If src is a drive ID, fetch as blob and create object URL
    if (!src.startsWith("http")) {
      driveApi
        .getFileBlob(src)
        .then((blob) => {
          if (cancelled) return;
          
          objectUrl = URL.createObjectURL(blob);
          setImgUrl(objectUrl);
          setImgError(false);
        })
        .catch((err) => {
          if (cancelled) return;
          
          console.error("Failed to load image blob:", err);
          // Fallback to legacy URL
          driveApi.getImageUrl(src).then((url) => {
            if (!cancelled && url) {
              setImgUrl(url);
              setImgError(false);
            }
          }).catch(() => {
            if (!cancelled) {
              setImgError(true);
            }
          });
        });
    } else {
      setImgUrl(src);
      setImgError(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [block.type, block.metadata?.src]);

  useEffect(() => {
    if (block.type === "code") {
      codeToHtml(block.content, {
        lang: block.metadata?.language || "typescript",
        theme: "github-dark",
      }).then(setHighlightedCode);
    }
  }, [block.type, block.content, block.metadata?.language]);

  const getBlockStyle = () => {
    switch (block.type) {
      case "h1":
        return "text-xl sm:text-2xl font-semibold text-github-blue mt-2 sm:mt-3 mb-1 sm:mb-1.5 leading-snug tracking-tight";
      case "h2":
        return "text-lg sm:text-xl font-semibold text-github-blue mt-1.5 sm:mt-2.5 mb-0.5 sm:mb-1 leading-snug tracking-tight";
      case "h3":
        return "text-base sm:text-lg font-semibold text-github-blue mt-1 sm:mt-2 mb-0.5 leading-snug tracking-tight";
      case "blockquote":
        return "border-l-4 border-muted-foreground/40 pl-3 sm:pl-4 not-italic text-muted-foreground leading-snug";
      case "code":
        return "font-mono bg-card/70 p-2 sm:p-3 rounded-md border border-border text-xs sm:text-sm my-1 sm:my-1.5 leading-snug";
      case "hr":
        return "border-t-2 border-border my-3 sm:my-4 py-0 pointer-events-none";
      case "checkbox":
        return "leading-snug transition-opacity duration-300 font-normal";
      case "image":
        return "my-2 sm:my-3 flex flex-col gap-2 group/image";
      default:
        return "leading-snug font-normal tracking-normal";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 sm:gap-3 py-0.5 transition-colors duration-75",
        isActive && "bg-github-blue/5",
        block.type === "checkbox" &&
          block.metadata?.status === "in_progress" &&
          "bg-github-yellow/[0.03]",
        block.type === "checkbox" &&
          block.metadata?.status === "done" &&
          "opacity-50",
        // Add spacing at the start of special block groups
        (block.type === "checkbox" || block.type === "code" || block.type === "blockquote") && 
          isFirstInGroup && 
          "mt-1.5",
        // Add spacing at the end of special block groups
        (block.type === "checkbox" || block.type === "code" || block.type === "blockquote") && 
          isLastInGroup && 
          "mb-1.5",
        block.type === "image" && "bg-transparent items-start py-1",
        (block.type === "h1" || block.type === "h2" || block.type === "h3") && "items-start",
      )}
    >
      {/* Gutter / Line Numbers */}
      <div className="w-8 sm:w-10 text-right text-[9px] sm:text-[10px] text-muted-foreground/40 select-none font-mono shrink-0 leading-snug">
        {showLineNumbers ? lineNumberOffset : ""}
      </div>

      <div
        className={cn(
          "flex-1 relative flex items-start text-sm sm:text-[15px]",
          block.type === "checkbox" ? "gap-2 sm:gap-2.5 flex-row items-center" : "gap-2 sm:gap-2.5",
          getBlockStyle(),
        )}
      >
        {/* Formatting Toolbar / Slash Menu */}
        {isActive && block.content === "" && (
          <div className="absolute -top-12 sm:-top-10 left-0 flex items-center gap-1 bg-card border border-border px-2 py-1.5 sm:py-1 rounded shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onUpdate({ type: "checkbox", metadata: { status: "todo" } });
              }}
              className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              TODO
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onUpdate({ type: "code" });
              }}
              className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              CODE
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onUpdate({ type: "blockquote" });
              }}
              className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold uppercase min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              Quote
            </button>
            {block.type !== "image" && (
              <>
                <div className="w-[1px] h-3 bg-border mx-1" />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onMoveUp?.();
                  }}
                  className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold uppercase min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  ↑
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onMoveDown?.();
                  }}
                  className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold uppercase min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  ↓
                </button>
              </>
            )}
          </div>
        )}

        {/* Slash Menu */}
        {isActive && filteredCommands.length > 0 && (
          <div className="absolute top-8 left-0 w-64 bg-card border border-border rounded-md shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-75">
            <div className="px-3 py-2 border-b border-border bg-accent/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Commands
              </span>
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {slashMenuIndex + 1} / {filteredCommands.length}
              </span>
            </div>
            <div className="p-1 flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
              {filteredCommands.map((item, index) => (
                <button
                  key={item.label + item.type}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    item.action();
                  }}
                  onMouseEnter={() => setSlashMenuIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-1.5 rounded text-left transition-colors group",
                    index === slashMenuIndex ? "bg-github-blue/10" : "hover:bg-accent"
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center bg-background border border-border rounded text-xs font-bold transition-colors",
                    index === slashMenuIndex ? "text-github-blue border-github-blue/30 shadow-[0_0_8px_rgba(88,166,255,0.1)]" : "text-muted-foreground group-hover:text-github-blue group-hover:border-github-blue/30"
                  )}>
                    {item.icon}
                  </span>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-xs font-semibold",
                      index === slashMenuIndex ? "text-github-blue" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {block.type === "image" ? (
          <div className="w-full flex flex-col gap-2 group/image-block">
            {/* Image Preview with Overlay Controls */}
            <div className="relative rounded-md border border-border bg-card overflow-hidden w-full sm:max-w-md group/preview">
              {imgError ? (
                <div className="h-40 sm:h-48 flex items-center justify-center bg-red-500/10 border-2 border-red-500/30 text-red-400">
                  <div className="flex flex-col items-center gap-3 px-4 text-center">
                    <svg
                      className="w-12 h-12 sm:w-14 sm:h-14"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <div className="text-sm font-bold mb-1">Image Not Found</div>
                      <div className="text-xs opacity-75">File may have been deleted or moved</div>
                    </div>
                    {onDelete && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onDelete();
                        }}
                        className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors"
                      >
                        Delete This Block
                      </button>
                    )}
                  </div>
                </div>
              ) : imgUrl ? (
                <img
                  key={imgUrl}
                  src={imgUrl}
                  alt={block.content || "Image"}
                  className="w-full h-auto max-h-64 sm:max-h-56 object-contain bg-muted/20"
                  loading="eager"
                  decoding="async"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-40 sm:h-48 flex items-center justify-center animate-pulse text-muted-foreground/20">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-8 h-8 sm:w-10 sm:h-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-xs uppercase tracking-widest font-bold">
                      Loading...
                    </span>
                  </div>
                </div>
              )}

              {/* Overlay Controls - Top Right */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-100 transition-opacity">
                {onDelete && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                    className="p-2 sm:p-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors touch-manipulation shadow-xl min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center border-2 border-white/20"
                    title="Delete image"
                  >
                    ✕
                  </button>
                )}
                {onMoveUp && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onMoveUp();
                    }}
                    className="p-2 sm:p-1.5 bg-black/80 backdrop-blur-sm hover:bg-github-blue text-white rounded text-xs font-bold transition-colors touch-manipulation shadow-xl min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center border-2 border-white/10"
                    title="Move image up"
                  >
                    ↑
                  </button>
                )}
                {onMoveDown && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onMoveDown();
                    }}
                    className="p-2 sm:p-1.5 bg-black/80 backdrop-blur-sm hover:bg-github-blue text-white rounded text-xs font-bold transition-colors touch-manipulation shadow-xl min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center border-2 border-white/10"
                    title="Move image down"
                  >
                    ↓
                  </button>
                )}
              </div>

              {/* Alt Text Badge - Bottom Left */}
              {block.content && (
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded opacity-0 sm:group-hover/preview:opacity-100 transition-opacity max-w-[80%] truncate">
                  {block.content}
                </div>
              )}
            </div>

            {/* Compact Markdown Editor Below Image */}
            <div className="flex items-start gap-2 w-full sm:max-w-md">
              <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0 pt-2">
                MD:
              </span>
              <textarea
                ref={textareaRef}
                value={`![${block.content}](${block.metadata?.src || ""})`}
                onChange={(e) => {
                  const val = e.target.value;
                  // Parse markdown image syntax: ![alt](src)
                  const match = val.match(/^!\[(.*?)\]\((.*?)\)$/);
                  if (match) {
                    const [, altText, src] = match;
                    onUpdate({ content: altText, metadata: { src } });
                  } else {
                    // If not valid markdown, just update content
                    onUpdate({ content: val });
                  }
                }}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
                placeholder="![alt](url-or-id)"
                className="text-[11px] font-mono bg-muted/30 border border-border/50 focus:border-github-blue/50 focus:bg-muted/50 rounded px-2 py-2 sm:py-1.5 resize-none w-full text-muted-foreground focus:text-foreground leading-tight transition-colors overflow-hidden min-h-[44px] sm:min-h-0"
                rows={2}
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <>
            {block.type === "checkbox" && (
              <button
                onClick={() => {
                  const currentStatus = block.metadata?.status || "todo";
                  const nextStatus =
                    currentStatus === "todo"
                      ? "in_progress"
                      : currentStatus === "in_progress"
                        ? "done"
                        : "todo";
                  onUpdate({
                    metadata: { ...block.metadata, status: nextStatus },
                  });
                }}
                className={cn(
                  "font-mono inline-flex items-center transition-all duration-200 shrink-0 hover:bg-accent/50 rounded leading-none -my-0.5 px-0.5",
                  "text-sm sm:text-[15px]",
                  block.metadata?.status === "done" && "text-github-green",
                  block.metadata?.status === "in_progress" &&
                    "text-github-yellow",
                  block.metadata?.status === "todo" &&
                    "text-muted-foreground/40 hover:text-muted-foreground",
                )}
              >
                <span className="inline-flex items-center tracking-tighter font-bold leading-none">
                  [
                  <span className="w-2 inline-flex justify-center items-center">
                    {block.metadata?.status === "done" ? (
                      <span>x</span>
                    ) : block.metadata?.status === "in_progress" ? (
                      <span className="w-1 h-1 rounded-full bg-github-yellow animate-pulse shadow-[0_0_4px_currentColor]" />
                    ) : (
                      <span className="w-1" />
                    )}
                  </span>
                  ]
                </span>
              </button>
            )}

            {block.type === "hr" ? (
              <div className="w-full border-t border-border mt-3" />
            ) : block.type === "code" && !isActive && highlightedCode ? (
              <div
                className="w-full font-mono text-sm p-0 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                onClick={onFocus}
              />
            ) : (
              <textarea
                ref={textareaRef}
                id={`block-${block.id}`}
                value={block.content}
                onChange={(e) => {
                  const val = e.target.value;

                  // Auto-convert block types based on prefixes
                  if (val.startsWith("# ")) {
                    onUpdate({ type: "h1", content: val.substring(2) });
                    return;
                  }
                  if (val.startsWith("## ")) {
                    onUpdate({ type: "h2", content: val.substring(3) });
                    return;
                  }
                  if (val.startsWith("### ")) {
                    onUpdate({ type: "h3", content: val.substring(4) });
                    return;
                  }
                  if (val.startsWith("> ")) {
                    onUpdate({ type: "blockquote", content: val.substring(2) });
                    return;
                  }
                  if (val.startsWith("- [ ] ")) {
                    onUpdate({
                      type: "checkbox",
                      content: val.substring(6),
                      metadata: { status: "todo" },
                    });
                    return;
                  }
                  if (val.startsWith("- [/] ")) {
                    onUpdate({
                      type: "checkbox",
                      content: val.substring(6),
                      metadata: { status: "in_progress" },
                    });
                    return;
                  }
                  if (val.startsWith("- [x] ")) {
                    onUpdate({
                      type: "checkbox",
                      content: val.substring(6),
                      metadata: { status: "done" },
                    });
                    return;
                  }
                  if (val.startsWith("- ") || val.startsWith("* ")) {
                    onUpdate({ type: "ul", content: val.substring(2) });
                    return;
                  }
                  if (/^\d+\. /.test(val)) {
                    onUpdate({
                      type: "ol",
                      content: val.replace(/^\d+\. /, ""),
                    });
                    return;
                  }
                  if (val.startsWith("```")) {
                    onUpdate({
                      type: "code",
                      content: "",
                      metadata: { language: val.substring(3).trim() },
                    });
                    return;
                  }
                  if (val.startsWith("---")) {
                    onUpdate({ type: "hr", content: "" });
                    return;
                  }

                  // Emoji shortcodes (basic set)
                  const emojiMap: Record<string, string> = {
                    ":done:": "✅",
                    ":todo:": "📝",
                    ":fire:": "🔥",
                    ":rocket:": "🚀",
                    ":bug:": "🐛",
                    ":warn:": "⚠️",
                  };

                  let newContent = val;
                  Object.entries(emojiMap).forEach(([short, emoji]) => {
                    newContent = newContent.replace(short, emoji);
                  });

                  if (newContent !== val) {
                    onUpdate({ content: newContent });
                    return;
                  }

                  onUpdate({ content: val });
                }}
                onFocus={onFocus}
                onKeyDown={(e) => {
                  // Handle Slash Command Keyboard Navigation
                  if (handleSlashKeyDown(e)) return;

                  // Smart Auto-pairing
                  const pairs: Record<string, string> = {
                    "(": ")",
                    "[": "]",
                    "{": "}",
                    '"': '"',
                    "'": "'",
                    "`": "`",
                  };

                  if (pairs[e.key]) {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const val = e.currentTarget.value;
                    const selection = val.substring(start, end);
                    const newVal =
                      val.substring(0, start) +
                      e.key +
                      selection +
                      pairs[e.key] +
                      val.substring(end);

                    onUpdate({ content: newVal });

                    // Set cursor position after update
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = start + 1;
                        textareaRef.current.selectionEnd =
                          start + 1 + selection.length;
                      }
                    }, 0);
                    return;
                  }

                  onKeyDown(e);
                }}
                rows={1}
                className={cn(
                  "w-full bg-transparent border-none focus:ring-0 resize-none p-0 overflow-hidden focus:outline-none placeholder:opacity-20 transition-colors",
                  block.type === "code" && "font-mono",
                  block.type === "checkbox" &&
                    block.metadata?.status === "done" &&
                    "line-through opacity-50",
                )}
                placeholder="..."
                spellCheck={false}
              />
            )}
          </>
        )}

        {/* Code Language Indicator */}
        {block.type === "code" && (
          <div className="absolute top-0 right-0 p-1 text-[10px] text-muted-foreground/50 uppercase font-mono">
            {block.metadata?.language || "text"}
          </div>
        )}
      </div>
    </div>
  );
}
