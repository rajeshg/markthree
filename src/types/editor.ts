export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'li' | 'blockquote' | 'code' | 'hr' | 'checkbox' | 'image';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
}

export interface EditorState {
  blocks: EditorBlock[];
  activeBlockId: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}
