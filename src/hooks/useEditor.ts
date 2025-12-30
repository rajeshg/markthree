import { useState, useCallback } from 'react';
import { EditorBlock, EditorState } from '@/types/editor';
import { parseMarkdownToBlocks, blocksToMarkdown } from '@/lib/markdown/parser';
import { nanoid } from 'nanoid';

export function useEditor(initialMarkdown: string = '') {
  console.log('[useEditor] Initializing with markdown length:', initialMarkdown.length, 'bytes');
  const [state, setState] = useState<EditorState>(() => {
    console.log('[useEditor] Lazy initializer running, parsing markdown...');
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

  const addBlock = useCallback((type: EditorBlock['type'], afterId: string | null = null, initialData?: Partial<EditorBlock>) => {
    const newBlock: EditorBlock = {
      id: nanoid(),
      type,
      content: initialData?.content || '',
      metadata: initialData?.metadata || (type === 'checkbox' ? { status: 'todo' } : undefined)
    };

    setState((prev) => {
      const index = afterId ? prev.blocks.findIndex((b) => b.id === afterId) : prev.blocks.length - 1;
      const newBlocks = [...prev.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return {
        ...prev,
        blocks: newBlocks,
        activeBlockId: newBlock.id,
        isDirty: true,
      };
    });
  }, []);

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

  const getMarkdown = useCallback(() => {
    return blocksToMarkdown(state.blocks);
  }, [state.blocks]);

  const resetEditor = useCallback((markdown: string) => {
    setState({
      blocks: parseMarkdownToBlocks(markdown),
      activeBlockId: null,
      isDirty: false,
      lastSaved: new Date(),
    });
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.blocks.length - 1) return prev;

      const newBlocks = [...prev.blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
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
    moveBlock,
    getMarkdown,
    resetEditor,
    setActiveBlock: (id: string | null) => setState(p => ({ ...p, activeBlockId: id })),
  };
}
