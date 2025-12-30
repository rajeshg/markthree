import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditor } from './useEditor'

describe('useEditor', () => {
  describe('initialization', () => {
    it('should initialize with empty markdown', () => {
      const { result } = renderHook(() => useEditor())
      
      expect(result.current.state.blocks).toHaveLength(1)
      expect(result.current.state.blocks[0].type).toBe('p')
      expect(result.current.state.blocks[0].content).toBe('')
      expect(result.current.state.isDirty).toBe(false)
    })

    it('should parse initial markdown into blocks', () => {
      const markdown = '# Hello\n\nThis is a paragraph.'
      const { result } = renderHook(() => useEditor(markdown))
      
      expect(result.current.state.blocks).toHaveLength(2)
      expect(result.current.state.blocks[0].type).toBe('h1')
      expect(result.current.state.blocks[0].content).toBe('Hello')
      expect(result.current.state.blocks[1].type).toBe('paragraph')
      expect(result.current.state.blocks[1].content).toBe('This is a paragraph.')
    })

    it('should parse complex markdown with multiple block types', () => {
      const markdown = `# Title
## Subtitle
This is text.
- [ ] Todo item
\`\`\`javascript
const x = 1;
\`\`\`
> Quote`
      
      const { result } = renderHook(() => useEditor(markdown))
      
      expect(result.current.state.blocks).toHaveLength(6)
      expect(result.current.state.blocks[0].type).toBe('h1')
      expect(result.current.state.blocks[1].type).toBe('h2')
      expect(result.current.state.blocks[2].type).toBe('paragraph')
      expect(result.current.state.blocks[3].type).toBe('checkbox')
      expect(result.current.state.blocks[4].type).toBe('code')
      expect(result.current.state.blocks[5].type).toBe('blockquote')
    })
  })

  describe('updateBlock', () => {
    it('should update block content', () => {
      const { result } = renderHook(() => useEditor('# Hello'))
      const blockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.updateBlock(blockId, { content: 'Updated' })
      })
      
      expect(result.current.state.blocks[0].content).toBe('Updated')
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should update block type', () => {
      const { result } = renderHook(() => useEditor('Hello'))
      const blockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.updateBlock(blockId, { type: 'h1' })
      })
      
      expect(result.current.state.blocks[0].type).toBe('h1')
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should update checkbox metadata', () => {
      const { result } = renderHook(() => useEditor('- [ ] Todo'))
      const blockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.updateBlock(blockId, { 
          metadata: { status: 'done' }
        })
      })
      
      expect(result.current.state.blocks[0].metadata?.status).toBe('done')
    })
  })

  describe('addBlock', () => {
    it('should add block at the end when afterId is null', () => {
      const { result } = renderHook(() => useEditor('# Title'))
      
      act(() => {
        result.current.addBlock('p', null)
      })
      
      expect(result.current.state.blocks).toHaveLength(2)
      expect(result.current.state.blocks[1].type).toBe('p')
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should add block after specific block', () => {
      const { result } = renderHook(() => useEditor('# Title\n\nParagraph'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.addBlock('h2', firstBlockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(3)
      expect(result.current.state.blocks[1].type).toBe('h2')
      expect(result.current.state.blocks[2].type).toBe('p')
    })

    it('should add checkbox with default metadata', () => {
      const { result } = renderHook(() => useEditor('Test'))
      
      act(() => {
        result.current.addBlock('checkbox')
      })
      
      const checkboxBlock = result.current.state.blocks.find(b => b.type === 'checkbox')
      expect(checkboxBlock?.metadata?.status).toBe('todo')
    })

    it('should set new block as active', () => {
      const { result } = renderHook(() => useEditor('Test'))
      
      act(() => {
        result.current.addBlock('p')
      })
      
      const newBlock = result.current.state.blocks[result.current.state.blocks.length - 1]
      expect(result.current.state.activeBlockId).toBe(newBlock.id)
    })
  })

  describe('removeBlock', () => {
    it('should remove block and focus previous', () => {
      const { result } = renderHook(() => useEditor('# Title\n\nParagraph\n\nAnother'))
      const secondBlockId = result.current.state.blocks[1].id
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.removeBlock(secondBlockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(2)
      expect(result.current.state.activeBlockId).toBe(firstBlockId)
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should not remove if only one block remains', () => {
      const { result } = renderHook(() => useEditor('Only block'))
      const blockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.removeBlock(blockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(1)
    })

    it('should focus first block when removing first of many', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond\n\nThird'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.removeBlock(firstBlockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(2)
      expect(result.current.state.blocks[0].content).toBe('Second')
    })
  })

  describe('mergeWithPrevious', () => {
    it('should merge block content with previous', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const secondBlockId = result.current.state.blocks[1].id
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.mergeWithPrevious(secondBlockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(1)
      expect(result.current.state.blocks[0].content).toBe('FirstSecond')
      expect(result.current.state.activeBlockId).toBe(firstBlockId)
    })

    it('should not merge first block', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.mergeWithPrevious(firstBlockId)
      })
      
      expect(result.current.state.blocks).toHaveLength(2)
    })

    it('should merge blocks with different content lengths', () => {
      const { result } = renderHook(() => useEditor('Short\n\nThis is a much longer second block'))
      const secondBlockId = result.current.state.blocks[1].id
      
      act(() => {
        result.current.mergeWithPrevious(secondBlockId)
      })
      
      expect(result.current.state.blocks[0].content).toBe('ShortThis is a much longer second block')
    })
  })

  describe('moveBlock', () => {
    it('should move block up', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond\n\nThird'))
      const secondBlockId = result.current.state.blocks[1].id
      
      act(() => {
        result.current.moveBlock(secondBlockId, 'up')
      })
      
      expect(result.current.state.blocks[0].content).toBe('Second')
      expect(result.current.state.blocks[1].content).toBe('First')
      expect(result.current.state.blocks[2].content).toBe('Third')
    })

    it('should move block down', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond\n\nThird'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.moveBlock(firstBlockId, 'down')
      })
      
      expect(result.current.state.blocks[0].content).toBe('Second')
      expect(result.current.state.blocks[1].content).toBe('First')
    })

    it('should not move first block up', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.moveBlock(firstBlockId, 'up')
      })
      
      expect(result.current.state.blocks[0].content).toBe('First')
    })

    it('should not move last block down', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const lastBlockId = result.current.state.blocks[1].id
      
      act(() => {
        result.current.moveBlock(lastBlockId, 'down')
      })
      
      expect(result.current.state.blocks[1].content).toBe('Second')
    })

    it('should mark state as dirty when moving', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const firstBlockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.moveBlock(firstBlockId, 'down')
      })
      
      expect(result.current.state.isDirty).toBe(true)
    })
  })

  describe('getMarkdown', () => {
    it('should convert blocks back to markdown', () => {
      const markdown = '# Title\n\nParagraph text.'
      const { result } = renderHook(() => useEditor(markdown))
      
      const output = result.current.getMarkdown()
      
      expect(output).toBe(markdown)
    })

    it('should handle complex markdown conversion', () => {
      const markdown = `# Title
## Subtitle
Paragraph
- [ ] Todo
\`\`\`js
code
\`\`\`
> Quote`
      
      const { result } = renderHook(() => useEditor(markdown))
      const output = result.current.getMarkdown()
      
      expect(output).toBe(markdown)
    })
  })

  describe('resetEditor', () => {
    it('should reset editor with new markdown', () => {
      const { result } = renderHook(() => useEditor('Original'))
      
      act(() => {
        result.current.updateBlock(result.current.state.blocks[0].id, { 
          content: 'Modified' 
        })
      })
      
      expect(result.current.state.isDirty).toBe(true)
      
      act(() => {
        result.current.resetEditor('# New Content')
      })
      
      expect(result.current.state.blocks).toHaveLength(1)
      expect(result.current.state.blocks[0].type).toBe('h1')
      expect(result.current.state.blocks[0].content).toBe('New Content')
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.lastSaved).toBeInstanceOf(Date)
    })

    it('should set activeBlockId to last block when focusLast is true', () => {
      const { result } = renderHook(() => useEditor('First'))
      
      act(() => {
        result.current.resetEditor('First\n\nSecond\n\nThird', { focusLast: true })
      })
      
      const lastBlockId = result.current.state.blocks[2].id
      expect(result.current.state.activeBlockId).toBe(lastBlockId)
    })

    it('should set activeBlockId to null when focusLast is false', () => {
      const { result } = renderHook(() => useEditor('First'))
      
      act(() => {
        result.current.resetEditor('First\n\nSecond', { focusLast: false })
      })
      
      expect(result.current.state.activeBlockId).toBeNull()
    })
  })

  describe('setActiveBlock', () => {
    it('should set active block', () => {
      const { result } = renderHook(() => useEditor('First\n\nSecond'))
      const blockId = result.current.state.blocks[1].id
      
      act(() => {
        result.current.setActiveBlock(blockId)
      })
      
      expect(result.current.state.activeBlockId).toBe(blockId)
    })

    it('should clear active block when set to null', () => {
      const { result } = renderHook(() => useEditor('Test'))
      const blockId = result.current.state.blocks[0].id
      
      act(() => {
        result.current.setActiveBlock(blockId)
      })
      
      expect(result.current.state.activeBlockId).toBe(blockId)
      
      act(() => {
        result.current.setActiveBlock(null)
      })
      
      expect(result.current.state.activeBlockId).toBeNull()
    })
  })
})
