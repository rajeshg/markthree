# MarkThree v2 - Agent Guidelines

This document provides agentic coding agents with essential instructions for working on the MarkThree v2 project (React 19 + TanStack + TypeScript).

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

### React Patterns
- **Functional components only** (no class components)
- **Hooks:** Use TanStack Query for server state, Context for global state
- **useEffect minimization:** <15 total in codebase
  - Use TanStack Router loaders for initial data fetching
  - Use TanStack Query for cache management
  - Use useSyncExternalStore for external subscriptions
  - Custom hooks encapsulate useEffect logic
  
```typescript
// Good: Use loader instead of useEffect
export const Route = createFileRoute('/docs/$docId')({
  loader: ({ params }) => queryClient.ensureQueryData(docQuery(params.docId)),
  component: DocPage,
});

function DocPage(): JSX.Element {
  const { docId } = Route.useParams();
  const { data: doc } = useQuery(docQuery(docId));
  return <div>{doc.title}</div>;
}

// Avoid: useEffect for data fetching
useEffect(() => {
  fetchDoc(docId).then(setDoc);
}, [docId]);
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
import { RootRoute } from '@tanstack/react-router';

export const RootRoute = createRootRoute({
  component: Root,
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
});

// src/routes/index.tsx (/)
// src/routes/setup.tsx (/setup)
// src/routes/_authenticated/editor.tsx (protected)
// src/routes/_authenticated/$docId.tsx (/doc/:id)
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
