import { useState, useCallback } from "react";
import { EditorBlock, EditorState } from "@/types/editor";
import { parseMarkdownToBlocks, blocksToMarkdown } from "@/lib/markdown/parser";
import { nanoid } from "nanoid";

export function useEditor(initialMarkdown: string = "") {
  const [state, setState] = useState<EditorState>(() => {
    return {
      blocks: parseMarkdownToBlocks(initialMarkdown),
      activeBlockId: null,
      isDirty: false,
      lastSaved: null,
    };
  });

  const updateBlock = useCallback((id: string, updates: Partial<EditorBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      isDirty: true,
    }));
  }, []);

  const addBlock = useCallback(
    (
      type: EditorBlock["type"],
      afterId: string | null = null,
      initialData?: Partial<EditorBlock>,
    ) => {
      const newBlock: EditorBlock = {
        id: nanoid(),
        type,
        content: initialData?.content || "",
        metadata: initialData?.metadata || (type === "checkbox" ? { status: "todo" } : undefined),
      };

      setState((prev) => {
        const index = afterId
          ? prev.blocks.findIndex((b) => b.id === afterId)
          : prev.blocks.length - 1;
        const newBlocks = [...prev.blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        return {
          ...prev,
          blocks: newBlocks,
          activeBlockId: newBlock.id,
          isDirty: true,
        };
      });
    },
    [],
  );

  const removeBlock = useCallback((id: string) => {
    setState((prev) => {
      if (prev.blocks.length <= 1) return prev;
      const index = prev.blocks.findIndex((b) => b.id === id);
      const newBlocks = prev.blocks.filter((b) => b.id !== id);
      const nextActiveId = newBlocks[Math.max(0, index - 1)].id;
      return {
        ...prev,
        blocks: newBlocks,
        activeBlockId: nextActiveId,
        isDirty: true,
      };
    });
  }, []);

  const mergeWithPrevious = useCallback((id: string) => {
    setState((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index <= 0) return prev; // Can't merge if first block

      const currentBlock = prev.blocks[index];
      const previousBlock = prev.blocks[index - 1];

      // Merge content into previous block
      const mergedContent = previousBlock.content + currentBlock.content;
      const newBlocks = [...prev.blocks];
      newBlocks[index - 1] = { ...previousBlock, content: mergedContent };
      newBlocks.splice(index, 1);

      return {
        ...prev,
        blocks: newBlocks,
        activeBlockId: previousBlock.id,
        isDirty: true,
      };
    });
  }, []);

  const getMarkdown = useCallback(() => {
    return blocksToMarkdown(state.blocks);
  }, [state.blocks]);

  const resetEditor = useCallback((markdown: string, options?: { focusLast?: boolean }) => {
    const parsedBlocks = parseMarkdownToBlocks(markdown);
    const lastBlockId = parsedBlocks.length > 0 ? parsedBlocks[parsedBlocks.length - 1].id : null;

    setState({
      blocks: parsedBlocks,
      activeBlockId: options?.focusLast ? lastBlockId : null,
      isDirty: false,
      lastSaved: new Date(),
    });
  }, []);

  const markAsSaved = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date(),
    }));
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setState((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.blocks.length - 1) return prev;

      const newBlocks = [...prev.blocks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

      return {
        ...prev,
        blocks: newBlocks,
        isDirty: true,
      };
    });
  }, []);

  return {
    state,
    updateBlock,
    addBlock,
    removeBlock,
    mergeWithPrevious,
    moveBlock,
    getMarkdown,
    resetEditor,
    markAsSaved,
    setActiveBlock: (id: string | null) => setState((p) => ({ ...p, activeBlockId: id })),
  };
}
