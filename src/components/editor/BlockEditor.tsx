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
}: BlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);

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
        icon: "“",
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
        action: () => onUpdate({ content: format(new Date(), "yyyy-MM-dd ") }),
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
    if (block.type !== "image" || !block.metadata?.src) {
      return;
    }

    const src = block.metadata.src;
    console.log("[BlockEditor] Processing image block:", src);

    // If src is a drive ID, fetch as blob and create object URL
    if (!src.startsWith("http")) {
      driveApi
        .getFileBlob(src)
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          console.log("[BlockEditor] Object URL created:", objectUrl);
          setImgUrl(objectUrl);
        })
        .catch((err) => {
          console.error("[BlockEditor] Failed to load image blob:", err);
          // Fallback to legacy URL
          console.log("[BlockEditor] Attempting fallback with token-based URL");
          driveApi.getImageUrl(src).then((url) => {
            if (url) {
              console.log("[BlockEditor] Fallback URL set:", url);
              setImgUrl(url);
            } else {
              console.error("[BlockEditor] Fallback URL was empty");
            }
          });
        });
    } else {
      console.log("[BlockEditor] Using direct URL:", src);
      setImgUrl(src);
    }
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
        return "text-2xl font-bold text-github-blue mt-4 mb-2";
      case "h2":
        return "text-xl font-bold text-github-blue mt-3 mb-1";
      case "h3":
        return "text-lg font-bold text-github-blue mt-2";
      case "blockquote":
        return "border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground";
      case "code":
        return "font-mono bg-card/50 p-4 rounded-md border border-border text-sm my-2";
      case "hr":
        return "border-t-2 border-border my-6 py-0 pointer-events-none";
      case "checkbox":
        return "text-base leading-relaxed flex items-start gap-3 transition-opacity duration-300";
      case "image":
        return "my-4 flex flex-col gap-2 group/image";
      default:
        return "text-base leading-relaxed";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 py-0.5 transition-colors duration-75",
        isActive && "bg-github-blue/5",
        block.type === "checkbox" &&
          block.metadata?.status === "in_progress" &&
          "bg-github-yellow/[0.03]",
        block.type === "checkbox" &&
          block.metadata?.status === "done" &&
          "opacity-40",
        block.type === "image" && "bg-transparent",
      )}
    >
      {/* Gutter / Line Numbers */}
      <div className="w-12 pt-1.5 text-right text-[10px] text-muted-foreground/30 select-none font-mono shrink-0">
        {showLineNumbers ? lineNumberOffset : ""}
      </div>

      <div
        className={cn(
          "flex-1 min-h-[1.5em] relative flex items-start gap-3",
          getBlockStyle(),
        )}
      >
        {/* Formatting Toolbar / Slash Menu */}
        {isActive && block.content === "" && (
          <div className="absolute -top-10 sm:-top-8 left-0 flex items-center gap-1 bg-card border border-border px-2 py-1.5 sm:py-1 rounded shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onUpdate({ type: "h1" });
              }}
              className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              H1
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onUpdate({ type: "h2" });
              }}
              className="p-2 sm:p-1 hover:bg-accent rounded text-[10px] font-bold min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              H2
            </button>
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

        {/* Slash Menu (Experimental) */}
        {isActive && block.content === "/" && (
          <div className="absolute top-8 left-0 w-48 bg-card border border-border rounded-md shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-75">
            <div className="px-2 py-1.5 border-b border-border bg-accent/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Commands
              </span>
            </div>
            <div className="p-1 flex flex-col gap-0.5">
              {[
                { label: "H1 Header", icon: "H1", type: "h1" },
                { label: "H2 Header", icon: "H2", type: "h2" },
                { label: "H3 Header", icon: "H3", type: "h3" },
                { label: "Task List", icon: "[ ]", type: "checkbox" },
                { label: "Code Block", icon: "</>", type: "code" },
                { label: "Quote", icon: "“", type: "blockquote" },
                { label: "Divider", icon: "—", type: "hr" },
              ].map((item) => (
                <button
                  key={item.type}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onUpdate({ type: item.type as any, content: "" });
                  }}
                  className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors group"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded text-[10px] font-bold group-hover:text-github-blue group-hover:border-github-blue/30">
                    {item.icon}
                  </span>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {block.type === "image" ? (
          <div className="w-full flex flex-col gap-2 group/image-block">
            {/* Image Preview with Overlay Controls */}
            <div className="relative rounded-md border border-border bg-card overflow-hidden w-full sm:max-w-md group/preview">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={block.content || "Image"}
                  className="w-full h-auto max-h-64 sm:max-h-56 object-contain"
                  onLoad={() =>
                    console.log(
                      "[IMG] Image loaded successfully from:",
                      imgUrl.substring(0, 50),
                    )
                  }
                  onError={(e) => {
                    console.error(
                      "[IMG] Image failed to load from:",
                      imgUrl.substring(0, 100),
                    );
                    console.error("[IMG] Image element:", e.currentTarget);
                    e.currentTarget.style.display = "none";
                  }}
                  loading="lazy"
                  decoding="async"
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-xs uppercase tracking-widest font-bold">
                      Loading...
                    </span>
                  </div>
                </div>
              )}

              {/* Overlay Controls - Top Right */}
              <div className="absolute top-2 right-2 flex gap-1 sm:opacity-0 group-hover/preview:opacity-100 transition-opacity">
                {onMoveUp && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onMoveUp();
                    }}
                    className="p-2 sm:p-1.5 bg-black/70 backdrop-blur-sm hover:bg-github-blue text-white rounded text-xs font-bold transition-colors touch-manipulation shadow-lg min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
                    className="p-2 sm:p-1.5 bg-black/70 backdrop-blur-sm hover:bg-github-blue text-white rounded text-xs font-bold transition-colors touch-manipulation shadow-lg min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
              <div className="flex flex-col items-center pt-1 shrink-0">
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
                    "font-mono text-xs flex items-center justify-center transition-all duration-200 p-1 -m-1 min-w-[32px] min-h-[32px]",
                    block.metadata?.status === "done" && "text-github-green",
                    block.metadata?.status === "in_progress" &&
                      "text-github-yellow",
                    block.metadata?.status === "todo" &&
                      "text-muted-foreground/40 hover:text-muted-foreground",
                  )}
                >
                  <span className="flex items-center tracking-tighter font-bold">
                    [
                    <span className="w-3 flex justify-center items-center">
                      {block.metadata?.status === "done" ? (
                        <span>x</span>
                      ) : block.metadata?.status === "in_progress" ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-github-yellow animate-pulse shadow-[0_0_4px_currentColor]" />
                      ) : (
                        <span className="w-1.5" />
                      )}
                    </span>
                    ]
                  </span>
                </button>
                {block.metadata?.status === "in_progress" && (
                  <span className="text-[6px] font-bold text-github-yellow/50 mt-0.5 tracking-tighter animate-pulse uppercase">
                    Run
                  </span>
                )}
                {block.metadata?.status === "done" && (
                  <span className="text-[6px] font-bold text-github-green/50 mt-0.5 tracking-tighter uppercase">
                    Done
                  </span>
                )}
              </div>
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
                  "w-full bg-transparent border-none focus:ring-0 resize-none p-0 overflow-hidden leading-relaxed focus:outline-none placeholder:opacity-20 transition-all",
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
