# MarkThree v2 - Agent Guidelines

This document provides agentic coding agents with essential instructions for working on the MarkThree v2 project (React 19 + TanStack Start + TypeScript).

## Critical: TanStack Start SSR Architecture

**MarkThree v2 uses TanStack Start** which provides full SSR (Server-Side Rendering) capabilities. We MUST leverage these patterns properly to avoid common pitfalls like infinite loops, unnecessary re-renders, and poor performance.

### The Golden Rule: Minimize `useEffect`

**Target: <15 `useEffect` hooks in the entire codebase**

`useEffect` should ONLY be used for:
1. **DOM side effects** (focus management, scroll position, canvas drawing)
2. **External subscriptions** (WebSocket, window event listeners)
3. **Cleanup operations** (timers, animations, object URLs)

`useEffect` should NEVER be used for:
- ❌ Data fetching (use loaders instead)
- ❌ Redirects (use `beforeLoad` instead)
- ❌ Authentication checks (use `beforeLoad` instead)
- ❌ URL param synchronization (use loaders/search params instead)

## Build & Test Commands

### Development
```bash
npm run dev                 # Start Vite dev server (localhost:5173)
npm run build              # Production build with TypeScript check
npm run preview            # Preview production build
npm run type-check         # Run TypeScript compiler (no emit)
```

### Testing
```bash
npm test                   # Run Vitest suite
npm test -- --watch       # Watch mode
npm test -- --ui          # UI dashboard for tests
npm test -- <file-pattern> # Run single test file (e.g., npm test -- src/lib/editor.test.ts)
npm test -- --coverage    # Coverage report
```

### Linting & Formatting
```bash
npm run lint              # oxlint (fast Rust-based linter)
npm run format            # oxfmt format check
npm run format:fix        # oxfmt auto-format
```

## Project Structure & Conventions

### Directory Organization
- `/src/routes/` - File-based routing (TanStack Router auto-discovers)
- `/src/components/` - React components (ui/, editor/, layout/, modals/)
- `/src/hooks/` - Custom React hooks
- `/src/lib/` - Business logic (drive/, markdown/, utils/)
- `/src/contexts/` - React Contexts (Auth, Theme, Settings)
- `/src/types/` - TypeScript types and interfaces
- `/src/assets/` - Static assets (tryItNow.md, etc.)

### Import Style
```typescript
// Absolute imports (prefer)
import { useEditor } from '@/hooks/useEditor';
import { editorStyles } from '@/lib/styles';
import type { Document } from '@/types/document';

// Relative imports only for same-folder files
import { helper } from './helper';

// Organize imports: built-ins → external → internal → types
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { EditorState } from '@/types/editor';
```

## Code Style & Formatting

### TypeScript Conventions
- **Strict mode:** All files use `strict: true` in tsconfig.json
- **Types:** Explicit return types on all functions/methods
- **No `any`:** Use `unknown` with type guards, or generic types
- **Interfaces:** For React component props, use interfaces; for data use types
- **Naming:** PascalCase for components/classes, camelCase for variables/functions

```typescript
// Good
interface EditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
}

function Editor({ content, onSave }: EditorProps): JSX.Element {
  const [state, setState] = useState<EditorState>(initialState);
  // ...
}

// Bad
const Editor = (props: any) => { /* ... */ };
function doStuff(x) { /* ... */ }
```

### React Patterns with TanStack Start SSR
- **Functional components only** (no class components)
- **Hooks:** Use TanStack Query for server state, Context for global state
- **useEffect minimization:** <15 total in codebase (see Golden Rule above)

#### Data Fetching: Use Loaders, Not useEffect
```typescript
// ✅ GOOD: Use loader for data fetching
export const Route = createFileRoute('/docs/$docId')({
  loader: async ({ context, params }) => {
    // This runs on server AND client during navigation
    const doc = await context.queryClient.ensureQueryData({
      queryKey: ['doc', params.docId],
      queryFn: () => fetchDoc(params.docId),
    });
    return { doc };
  },
  component: DocPage,
});

function DocPage() {
  const { doc } = Route.useLoaderData();
  // Data is already here, no loading states needed!
  return <div>{doc.title}</div>;
}

// ❌ BAD: useEffect for data fetching
function BadDocPage() {
  const { docId } = useParams();
  const [doc, setDoc] = useState(null);
  
  useEffect(() => {
    fetchDoc(docId).then(setDoc); // Client-only, loading states, race conditions
  }, [docId]);
  
  if (!doc) return <Loader />;
  return <div>{doc.title}</div>;
}
```

#### Redirects: Use beforeLoad, Not useEffect
```typescript
// ✅ GOOD: Redirects in beforeLoad
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const { data: session } = await authClient.getSession();
    
    if (session) {
      // Check settings from localStorage or context
      const hasSetup = localStorage.getItem('app-settings');
      if (hasSetup) {
        throw redirect({ to: '/editor' });
      }
      throw redirect({ to: '/setup' });
    }
    // No redirect needed, render component
  },
  component: HomePage,
});

// ❌ BAD: Redirects in useEffect (causes loops)
function BadHomePage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (session) {
      navigate({ to: '/editor' }); // Runs on every render, can loop
    }
  }, [session, navigate]); // Dependencies can cause infinite loops
  
  return <div>Home</div>;
}
```

#### Authentication: Use beforeLoad
```typescript
// ✅ GOOD: Auth check in route beforeLoad
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: '/',
        search: { redirect: location.href },
      });
    }
  },
});

// ❌ BAD: Auth check in useEffect
function ProtectedPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!session) {
      navigate({ to: '/' }); // Flickers, can show protected content
    }
  }, [session]);
  
  return <div>Protected Content</div>; // Might flash before redirect
}
```

#### Acceptable useEffect Examples
```typescript
// ✅ GOOD: Focus management (DOM side effect)
useEffect(() => {
  const input = inputRef.current;
  if (input && shouldFocus) {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  }
}, [shouldFocus]);

// ✅ GOOD: Window event listener (external subscription)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSearchModal();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [openSearchModal]);

// ✅ GOOD: Cleanup (object URL)
useEffect(() => {
  if (file) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }
}, [file]);

// ❌ BAD: Data synchronization (use loader/search params)
useEffect(() => {
  if (queryParam !== localState) {
    setLocalState(queryParam); // This should be in search params or loader
  }
}, [queryParam, localState]);
```

### Naming Conventions
- **Components:** `UserProfile`, `SettingsModal`
- **Hooks:** `useEditor`, `useSyncStatus`
- **Contexts:** `AuthContext`, `ThemeContext`
- **Types:** `EditorState`, `Document`
- **Constants:** `GITHUB_BLUE = '#58a6ff'`
- **Private/Internal:** prefix with `_` or use `#` for class fields
- **Event handlers:** `handleClick`, `onSave` (props), `handleChange` (internal)

### Error Handling
- Use try-catch for async operations
- Return `Result<T, E>` types or throw with custom error classes
- Never silently catch errors; log with context

```typescript
// Good
async function saveDocument(id: string, content: string): Promise<void> {
  try {
    const response = await api.updateDoc(id, content);
    if (!response.ok) {
      throw new Error(`Failed to save: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`[Document ${id}] Save failed:`, error);
    throw error; // Re-throw for caller to handle
  }
}

// Bad
async function saveDoc(id, content) {
  const r = await api.updateDoc(id, content);
  return r;
}

// Bad: Silent catch
try {
  await save();
} catch (e) {
  // swallow
}
```

## Architecture Decisions (Locked)

### Design & Theme
- **Theme:** GitHub Terminal (dark mode with GitHub colors)
- **Font:** Fira Code with ligatures enabled
- **Colors:** `#0d1117` (bg), `#c9d1d9` (fg), `#58a6ff` (primary)
- **Line numbers:** Optional toggle in settings

### Storage & Sync
- **Format:** Single `.md` files in user's Google Drive folder
- **Naming:** `Title (id).md` (e.g., `Meeting Notes (abc123).md`)
- **Conflict resolution:** Last-write-wins (single writer per folder)
- **No data migration:** v2 is fresh start from v1

### State Management
- **TanStack Query:** Server state (Drive files, docs)
- **Context:** Global state (Auth, Theme, Settings)
- **Local state:** Component-level with useState
- **Routing:** TanStack Router file-based (no Redux/Zustand)

## TanStack Router & Query Setup

### Router File Structure
```typescript
// src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: Root,
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
});

// src/routes/index.tsx (/)
// src/routes/setup.tsx (/setup)
// src/routes/_authenticated.tsx (layout with beforeLoad)
// src/routes/_authenticated/editor.tsx (protected)
```

### Loader Pattern
```typescript
// Loaders run on both server and client
export const Route = createFileRoute('/editor')({
  validateSearch: z.object({
    fileId: z.string().optional(),
  }),
  
  beforeLoad: async ({ search }) => {
    // Handle redirects before loading data
    if (!search.fileId) {
      const lastFileId = localStorage.getItem('last_file_id');
      if (lastFileId) {
        throw redirect({ to: '/editor', search: { fileId: lastFileId } });
      }
    }
  },
  
  loader: async ({ context, search }) => {
    // Fetch data with TanStack Query integration
    const fileData = await context.queryClient.ensureQueryData({
      queryKey: ['file', search.fileId],
      queryFn: () => driveApi.getFile(search.fileId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
    
    return { fileData };
  },
  
  component: EditorPage,
});

function EditorPage() {
  const { fileData } = Route.useLoaderData();
  const search = Route.useSearch();
  
  // Data is already loaded, no useEffect needed
  return <Editor file={fileData} />;
}
```

### Query Keys Convention
```typescript
// Keys should be arrays with hierarchical structure
export const docKeys = {
  all: ['docs'] as const,
  lists: () => [...docKeys.all, 'list'] as const,
  list: (folderId: string) => [...docKeys.lists(), folderId] as const,
  details: () => [...docKeys.all, 'detail'] as const,
  detail: (docId: string) => [...docKeys.details(), docId] as const,
};

// Use with useQuery
const { data } = useQuery({
  queryKey: docKeys.detail(docId),
  queryFn: () => fetchDoc(docId),
});
```

## Testing Guidelines

### Test File Locations
- `src/lib/utils.test.ts` → tests for `src/lib/utils.ts`
- `src/hooks/useEditor.test.ts` → tests for hook
- `src/components/Editor.test.tsx` → tests for component

### Test Structure
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from './Editor';

describe('Editor', () => {
  it('renders content', () => {
    render(<Editor content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Key Libraries & Usage

| Library | Purpose | Usage |
|---------|---------|-------|
| `@tanstack/react-router` | File-based routing | Replaces Next.js-style routing |
| `@tanstack/react-query` | Server state | Cache, sync, background updates |
| `tailwindcss` | Styling | GitHub Terminal theme |
| `date-fns` | Date handling | Replaces moment.js |
| `nanoid` | IDs | Replaces shortid |
| `marked` | Markdown parsing | Render MD to HTML |
| `turndown` | HTML to Markdown | Convert editor state to MD |
| `idb-keyval` | Offline storage | Simple IndexedDB wrapper |
| `zod` | Validation | Type-safe runtime validation |

## Performance Checklist

- [ ] Virtual scroll for large documents (useSyncExternalStore)
- [ ] Debounce sync operations (500-3000ms)
- [ ] Lazy-load components with React.lazy + Suspense
- [ ] Query cache strategy: staleTime, cacheTime
- [ ] Network requests deduplicated by TanStack Query
- [ ] Code splitting by route
- [ ] Minimize bundle: tree-shake unused code

## Common Commands for Agents

### Single Test File
```bash
npm test -- src/lib/markdown.test.ts
```

### Watch Specific Tests
```bash
npm test -- --watch src/components/
```

### Type Check Only
```bash
npm run build    # Checks types + builds
npm run type-check  # Type check only (if available)
```

### Debug in Browser
- TanStack Router DevTools: http://localhost:5173 (inspect routes)
- TanStack Query DevTools: DevTools button (inspect queries)
- React DevTools: Chrome extension (inspect components)

## Summary for Agents

1. **Write TypeScript** with strict types; no `any`
2. **Use functional components** with hooks
3. **Minimize useEffect** (<15 total); use loaders/Query instead
4. **Follow TanStack patterns** for routing and state
5. **Use GitHub Terminal theme** colors and Fira Code font
6. **Store single .md files** in Drive (not chunked)
7. **Test with Vitest**; organize tests alongside source
8. **Import from @/** for absolute paths
9. **No class components**, jQuery, or legacy patterns
10. **Pragmatic error handling** with logging and re-throwing
