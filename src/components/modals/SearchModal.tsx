import { useState, useEffect, useRef } from "react";
import { Search, FileText, Command, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { driveApi, DriveFile } from "@/lib/drive/drive-client";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string;
}

export function SearchModal({ isOpen, onClose, folderId = "root" }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  useEffect(() => {
    const searchFiles = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await driveApi.searchFiles(query);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchFiles, 300);
    return () => clearTimeout(timer);
  }, [query, folderId]);

  const handleSelect = (file: DriveFile) => {
    navigate({ to: "/editor", search: { fileId: file.id } });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center px-4 py-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg placeholder:text-muted-foreground/50 outline-none font-medium"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
              <Command size={10} /> ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-md text-muted-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-github-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Searching Drive...
              </span>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all group",
                    index === selectedIndex
                      ? "bg-github-blue/10 translate-x-1"
                      : "hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-md border border-border bg-background transition-colors",
                        index === selectedIndex
                          ? "text-github-blue border-github-blue/30 shadow-[0_0_12px_rgba(88,166,255,0.1)]"
                          : "text-muted-foreground",
                      )}
                    >
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          index === selectedIndex ? "text-github-blue" : "text-foreground",
                        )}
                      >
                        {file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                        Last modified: {format(new Date(file.modifiedTime), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className={cn(
                      "text-github-blue transition-all",
                      index === selectedIndex
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-2",
                    )}
                  />
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Search size={32} className="text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">No documents found</p>
                <p className="text-xs text-muted-foreground">Try a different search term</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                Type at least 2 characters to search
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[9px] font-mono text-muted-foreground">
                ENTER
              </kbd>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                Select
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[9px] font-mono text-muted-foreground">
                ↑↓
              </kbd>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                Navigate
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase">
            <Command size={10} /> K to close
          </div>
        </div>
      </div>
    </div>
  );
}
