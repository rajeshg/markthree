# MarkThree v2 - Implementation Plan

## Project Overview

MarkThree v2 is a modern rewrite of MarkTwo using:
- **TanStack Router** for file-based routing
- **React 19** with functional components
- **TanStack Query** for server state management
- **Tailwind CSS** with GitHub Terminal theme
- **Fira Code** font for developer aesthetic
- **Single .md file storage** in user's Google Drive folder

## Architecture Decisions (Locked In)

✅ **Design:** GitHub Terminal Theme  
✅ **Font:** Fira Code with ligatures  
✅ **UI:** Optional line numbers (toggle), status bar, command palette  
✅ **useEffect:** Pragmatic approach (< 15 total, mostly in utility hooks)  
✅ **TanStack Query:** YES (server state management)  
✅ **XState:** NO (keep it simple)  
✅ **Storage:** Single `.md` files in user's chosen Drive folder  
✅ **Folder Setup:** Both auto-create + user choice  
✅ **Conflicts:** Last-write-wins (single writer assumption)  
✅ **File Naming:** `Title (id).md` format  
✅ **Migration:** Not needed (fresh start)  
✅ **Location:** `markthree-v2/` subdirectory

## Phase Breakdown

### Phase 0: Project Setup (4-6 hours)
- [x] Run `create-tsrouter-app` starter
- [ ] Install dependencies
- [ ] Copy assets from old app
- [ ] Configure Tailwind with GitHub Terminal theme
- [ ] Setup Fira Code font
- [ ] Install shadcn/ui components
- [ ] Configure TypeScript
- [ ] Verify dev server runs

### Phase 1: Auth & Drive Foundation (6-8 hours)
- [ ] Create AuthContext with Google OAuth
- [ ] Load Google API scripts
- [ ] Implement login/logout/switch user
- [ ] Create ThemeContext for dark mode
- [ ] Create SettingsContext for app settings
- [ ] Create Drive Picker utility
- [ ] Create setup flow route
- [ ] Persist settings to localStorage
- [ ] Create root layout with providers
- [ ] Test auth flow end-to-end

### Phase 2: Drive Sync (Single .md Files) (8-12 hours)
- [ ] Create Drive sync utilities
- [ ] Implement `createMarkdownFile(title, content, folderId)`
- [ ] Implement `updateMarkdownFile(fileId, content)`
- [ ] Implement `readMarkdownFile(fileId)`
- [ ] Implement `listMarkdownFiles(folderId)`
- [ ] Setup TanStack Query for caching
- [ ] Add conflict detection
- [ ] Create conflict dialog
- [ ] Test CRUD operations

### Phase 3: Editor Core (15-25 hours)
- [ ] Create useEditor hook
- [ ] Parse markdown to blocks
- [ ] Handle block updates
- [ ] Handle block splitting (Enter key)
- [ ] Create EditorContent component
- [ ] Render contentEditable blocks
- [ ] Convert HTML ↔ Markdown
- [ ] Handle keyboard events
- [ ] Setup marked.js and Turndown
- [ ] Handle special rendering (bookmarks, reminders)

### Phase 4: Editor Features (12-18 hours)
- [ ] Create useAutocomplete hook
- [ ] Emoji autocomplete
- [ ] Slash commands (/now, /today, /tomorrow, /image, /date)
- [ ] Create ImageUploadDialog
- [ ] Create DatePickerDialog
- [ ] Implement reminders system
- [ ] Hashtag/mention detection
- [ ] Handle checkbox rendering

### Phase 5: Virtual Scroll (3-5 hours)
- [ ] Implement useSyncExternalStore for scroll
- [ ] Track visible range
- [ ] Dynamic block rendering
- [ ] Handle scroll up/down
- [ ] Trim excess blocks when > 500 rendered
- [ ] Test with large document

### Phase 6: Layout & UI (8-12 hours)
- [ ] Create Sidebar with file tree
- [ ] Create Command Palette (Cmd+K)
- [ ] Create SearchModal
- [ ] Create SettingsModal
- [ ] Create document list route
- [ ] Add LineNumbers component
- [ ] Add StatusBar component
- [ ] Terminal aesthetic styling

### Phase 7: Additional Features (8-12 hours)
- [ ] Document management (rename, delete, export)
- [ ] Search functionality
- [ ] Offline support with IndexedDB
- [ ] Privacy/Terms pages
- [ ] Bookmark view
- [ ] Reminder notifications

### Phase 8: Testing & Polish (10-15 hours)
- [ ] Manual functional testing
- [ ] Bug fixes and edge cases
- [ ] Performance optimization
- [ ] Visual polish and animations
- [ ] Loading/error states
- [ ] Empty states

### Phase 9: Deployment (3-5 hours)
- [ ] Create .env file template
- [ ] Configure environment variables
- [ ] Production build testing
- [ ] Deploy to hosting
- [ ] User testing

## Technology Stack

### Core Dependencies
- React 19.0.0
- React DOM 19.0.0
- @tanstack/react-router (latest)
- @tanstack/react-query (latest)
- @tanstack/react-router-devtools (latest)
- @tanstack/react-query-devtools (latest)

### UI & Styling
- tailwindcss 4.1.18
- @tailwindcss/typography
- class-variance-authority
- clsx
- tailwind-merge
- lucide-react
- @fontsource/fira-code

### Business Logic
- date-fns (replace moment)
- marked (markdown parser)
- turndown + turndown-plugin-gfm (HTML to Markdown)
- nanoid (replace shortid)
- md5 (hashing)
- idb-keyval (IndexedDB wrapper)
- emoji-dictionary (emoji support)
- async (utility library)

### Utilities & Hooks
- react-use (utility hooks)
- ahooks (more utility hooks)
- zod (validation)

### Dev Dependencies
- vite 7.1.7
- @vitejs/plugin-react
- typescript 5.7.2

## Project Structure

```
markthree-v2/
├── public/
│   ├── img/
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── try-it-now.tsx
│   │   ├── setup.tsx
│   │   ├── _authenticated/
│   │   │   ├── _layout.tsx
│   │   │   ├── editor.tsx
│   │   │   ├── docs/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $docId.tsx
│   │   │   └── settings.tsx
│   │   ├── privacy.tsx
│   │   └── terms.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── editor/
│   │   ├── layout/
│   │   └── modals/
│   ├── hooks/
│   ├── lib/
│   │   ├── drive/
│   │   └── markdown/
│   ├── contexts/
│   ├── types/
│   ├── assets/
│   ├── main.tsx
│   └── index.css
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Key Design Patterns

### useEffect Minimization
- TanStack Router loaders for data fetching
- TanStack Query for server state
- useSyncExternalStore for external subscriptions
- Callbacks and refs for imperative operations
- Custom hooks that encapsulate useEffect

### GitHub Terminal Theme Colors
```
Background: #0d1117
Foreground: #c9d1d9
Primary: #58a6ff (GitHub blue)
Success: #3fb950 (GitHub green)
Warning: #d29922 (GitHub yellow)
Danger: #f85149 (GitHub red)
```

### Single .md File Strategy
- Files stored as `Title (id).md` in user's Drive folder
- Portable and editable in any editor
- Last-write-wins conflict resolution
- Direct sync without chunking

## Testing Checklist

### Functional Tests
- [ ] Google login/logout/switch user
- [ ] Folder selection (create/choose)
- [ ] Document create/read/update/delete
- [ ] Markdown rendering (all features)
- [ ] Autocomplete (emoji, slash, hashtag, mention)
- [ ] Image upload
- [ ] Date picker
- [ ] Search functionality
- [ ] Reminders
- [ ] Dark mode toggle
- [ ] Line numbers toggle
- [ ] Offline mode
- [ ] Conflict detection

### Performance Tests
- [ ] Large document (>10,000 lines)
- [ ] Virtual scroll performance
- [ ] Sync debouncing
- [ ] Fast typing response

## Success Criteria

### MVP Launch
- [ ] User can log in with Google
- [ ] User can select/create Drive folder
- [ ] User can create, edit, save documents
- [ ] Documents sync to Drive as .md files
- [ ] Basic markdown rendering works
- [ ] Search works
- [ ] Dark mode works
- [ ] No critical bugs
- [ ] Loads in <3 seconds
- [ ] Works on desktop browsers

### Timeline
- **Full-time (40 hrs/week):** 3-4 weeks
- **Part-time (20 hrs/week):** 5-7 weeks
- **Weekend warrior (10 hrs/week):** 11-14 weeks

**Base estimate:** 77-118 hours
**With 30% buffer:** 100-154 hours
**Realistic:** 110-140 hours

## Environment Variables

```bash
# .env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_GA_ID=your_google_analytics_id (optional)
VITE_SENTRY_DSN=your_sentry_dsn (optional)
```

## Starting Phase 0

1. Run `npx create-tsrouter-app@latest markthree-v2`
2. Choose React + TypeScript + Vite + Tailwind
3. Install additional dependencies
4. Copy assets from old app
5. Configure theme and fonts
6. Verify dev server runs

## Notes

- **No migration:** Fresh start from old app, no data migration tool needed
- **Single writer:** Conflict resolution assumes single user per folder
- **Progressive:** Build MVP first, then iterate on features
- **Type-safe:** Full TypeScript throughout
- **Performance-first:** Virtual scroll, debounced sync, efficient queries
