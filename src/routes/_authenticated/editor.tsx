import { z } from 'zod'
import { useEditor } from '@/hooks/useEditor'
import { driveApi } from '@/lib/drive/drive-client'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import { Save, FileText, ChevronRight, Loader2, Image as ImageIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BlockEditor } from '@/components/editor/BlockEditor'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/editor')({
  validateSearch: (search) => z.object({
    fileId: z.string().optional()
  }).parse(search),
  component: EditorPage,
})

function EditorPage() {
   console.log('[Editor] RENDER START');
   const searchParams = Route.useSearch()
   const { fileId: queryFileId } = searchParams
   console.log('[Editor] useSearch result:', searchParams);
   const { settings } = useSettings()
   const queryClient = useQueryClient()
   const navigate = useNavigate()
   
   const [fileId, setFileId] = useState<string | null>(queryFileId || null)
   console.log('[Editor] Current fileId state:', fileId);
   const [fileName, setFileName] = useState('Untitled')
   const lastLoadedFileIdRef = useRef<string | null>(null)
   const { state, updateBlock, addBlock, removeBlock, moveBlock, getMarkdown, resetEditor, setActiveBlock } = useEditor('')
   const [saving, setSaving] = useState(false)
   const [isDragging, setIsDragging] = useState(false)

  const handleImageUpload = useCallback(async (file: File) => {
    if (!settings.driveFolderId) return
    setSaving(true)
    try {
      console.log('[Editor] Uploading image:', file.name, file.type, file.size)
      const driveFile = await driveApi.uploadImage(file, settings.driveFolderId)
      console.log('[Editor] Image uploaded successfully, fileId:', driveFile.id)
      
      const targetBlockId = state.activeBlockId || state.blocks[state.blocks.length - 1]?.id
      console.log('[Editor] Creating image block with id:', driveFile.id)
      
      addBlock('image', targetBlockId, {
        content: file.name,
        metadata: { src: driveFile.id }
      })
    } catch (err) {
      console.error('[Editor] Image upload failed', err)
    } finally {
      setSaving(false)
    }
  }, [settings.driveFolderId, state.activeBlockId, state.blocks, addBlock])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    for (const file of imageFiles) {
      await handleImageUpload(file)
    }
  }

  // Memoized line number offsets
  const lineOffsets = useMemo(() => {
    let currentLine = 1;
    return state.blocks.map(block => {
      const offset = currentLine;
      // Estimate lines: content lines + 1. Real wrap detection is complex, 
      // but this is a good "Code Editor" approximation.
      const lines = block.content.split('\n').length;
      currentLine += lines;
      return offset;
    });
  }, [state.blocks]);

   // Sync state with query param  
   useEffect(() => {
     console.log('[Editor] useEffect checking fileId:', { queryFileId, currentFileId: fileId, changed: queryFileId !== fileId });
     if (queryFileId !== fileId) {
       console.log('[Editor] FileId from URL:', queryFileId);
       setFileId(queryFileId || null)
       // Reset the loaded file tracking when URL changes
       lastLoadedFileIdRef.current = null
       console.log('[Editor] Reset lastLoadedFileIdRef due to URL change')
     }
   }, [queryFileId, fileId])

      // Fetch file content
      console.log('[Editor] About to create query with fileId:', fileId);
      const { data: fileData, isLoading: isLoadingContent, error: fetchError, status, isSuccess } = useQuery({
        queryKey: ['file', fileId],
        queryFn: async () => {
          console.log('[Editor] Query function called!');
          if (!fileId) {
            console.log('[Editor] No fileId, skipping fetch');
            return null;
          }
          console.log('[Editor] Fetching file content for:', fileId);
          try {
            const [metadata, content] = await Promise.all([
              driveApi.getFileMetadata(fileId),
              driveApi.getFileContent(fileId)
            ])
            console.log('[Editor] Fetched file:', metadata.name, 'size:', content.length);
            return { metadata, content }
          } catch (err) {
            console.error('[Editor] Fetch error:', err);
            throw err;
          }
        },
        enabled: !!fileId,
     })
     console.log('[Editor] Query status:', status, 'isLoading:', isLoadingContent, 'hasError:', !!fetchError, 'hasFileData:', !!fileData);
     console.log('[Editor] DEBUG: fileData object:', fileData);
     console.log('[Editor] DEBUG: About to register useEffect with deps:', { fileId, hasFileData: !!fileData, lastLoadedFileId: lastLoadedFileIdRef.current });
   
    // Load content into editor when data arrives
    useEffect(() => {
       console.log('[Editor] Load effect running:', { fileId, hasFileData: !!fileData, lastLoadedFileId: lastLoadedFileIdRef.current });
       console.log('[Editor] Load effect fileData:', fileData);
       
       // Load file content if we have data and it's different from what we loaded
       if (fileId && fileData) {
         const needsLoad = lastLoadedFileIdRef.current !== fileId;
         console.log('[Editor] needsLoad:', needsLoad, 'because lastLoaded:', lastLoadedFileIdRef.current, '!==', fileId);
         
         if (needsLoad) {
           console.log('[Editor] ✅ Loading content from Drive, bytes:', fileData.content?.length || 0)
           console.log('[Editor] Content preview:', fileData.content?.substring(0, 150))
           console.log('[Editor] About to call resetEditor with content')
           resetEditor(fileData.content)
           console.log('[Editor] resetEditor completed')
           setFileName(fileData.metadata.name.replace('.md', ''))
           lastLoadedFileIdRef.current = fileId
           console.log('[Editor] Updated lastLoadedFileIdRef to:', fileId)
         } else {
           console.log('[Editor] ⏭️  Skipping load, already loaded this file')
         }
       } else if (!fileId && lastLoadedFileIdRef.current !== null) {
         console.log('[Editor] No fileId, using empty editor')
         resetEditor('')
         setFileName('Untitled')
         lastLoadedFileIdRef.current = null
       }
     }, [fileData, fileId, isSuccess])

  // Auto-focus new blocks
  useEffect(() => {
    if (state.activeBlockId) {
      const el = document.getElementById(`block-${state.activeBlockId}`) as HTMLTextAreaElement
      if (el && document.activeElement !== el) {
        el.focus()
      }
    }
  }, [state.activeBlockId])

  const handleSave = async () => {
    if (!settings.driveFolderId) return
    setSaving(true)
    try {
      const content = getMarkdown()
      
      // If filename changed, rename on Drive too
      if (fileId && fileData && fileName !== fileData.metadata.name.replace('.md', '')) {
        await driveApi.renameFile(fileId, `${fileName}.md`)
      }

      if (fileId) {
        await driveApi.updateFile(fileId, content)
      } else {
        const file = await driveApi.createFile(`${fileName}.md`, content, settings.driveFolderId)
        setFileId(file.id)
        navigate({ 
          to: '/editor', 
          search: { fileId: file.id },
          replace: true 
        })
      }
      queryClient.invalidateQueries({ queryKey: ['drive-files'] })
      queryClient.invalidateQueries({ queryKey: ['file', fileId] })
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  if (isLoadingContent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-github-blue" size={32} />
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col bg-background font-mono overflow-hidden transition-colors duration-200",
        isDragging && "bg-github-blue/10"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-github-blue/20 backdrop-blur-sm pointer-events-none border-4 border-dashed border-github-blue m-4 rounded-xl">
          <div className="flex flex-col items-center gap-4 text-github-blue animate-bounce">
            <ImageIcon size={64} />
            <span className="text-xl font-bold uppercase tracking-widest">Drop Image to Upload</span>
          </div>
        </div>
      )}
      {/* Top Bar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText size={16} />
          <input 
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 hover:text-github-blue cursor-text w-32"
          />
          <ChevronRight size={14} />
          <span className="text-xs opacity-50">{fileId ? 'Synced to Drive' : 'Local Only'}</span>
        </div>
        <div className="flex items-center gap-4">
          {state.isDirty && <span className="text-[10px] text-github-yellow animate-pulse">● Unsaved Changes</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1 text-xs font-bold bg-github-blue hover:bg-github-blue/80 text-white rounded transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar p-8 max-w-5xl mx-auto w-full space-y-0"
        onClick={(e) => {
          if (e.target === e.currentTarget && state.blocks.length === 0) {
            addBlock('p')
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
            onMoveUp={() => moveBlock(block.id, 'up')}
            onMoveDown={() => moveBlock(block.id, 'down')}
            onKeyDown={(e) => {

                // Block reordering with Alt + Arrow
                if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                  e.preventDefault()
                  moveBlock(block.id, e.key === 'ArrowUp' ? 'up' : 'down')
                  return
                }

                if (e.key === 'Enter' && !e.shiftKey) {

                e.preventDefault()
                // If it's a list or checkbox, continue the pattern
                if (['ul', 'ol', 'checkbox'].includes(block.type) && block.content === '') {
                  updateBlock(block.id, { type: 'p' })
                } else {
                  // If current is checkbox, new one starts as 'todo' status
                  const newType = (block.type === 'ol' || block.type === 'ul' || block.type === 'checkbox') ? block.type : 'p'
                  addBlock(newType, block.id)
                }
              } else if (e.key === 'Backspace' && block.content === '' && state.blocks.length > 1) {
                e.preventDefault()
                removeBlock(block.id)
              } else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
                const prevBlock = state.blocks[index - 1]
                if (prevBlock) {
                  document.getElementById(`block-${prevBlock.id}`)?.focus()
                }
              } else if (e.key === 'ArrowDown' && e.currentTarget.selectionEnd === block.content.length) {
                const nextBlock = state.blocks[index + 1]
                if (nextBlock) {
                  document.getElementById(`block-${nextBlock.id}`)?.focus()
                }
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

