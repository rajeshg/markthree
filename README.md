# MarkThree

_A seamless, speedy, syncing markdown editor_

## Overview

MarkThree is a modern, block-based markdown editor built with React 19, TanStack Start, and TypeScript. It features real-time syncing with Google Drive, a terminal-inspired interface, and a focus on speed and simplicity.

## Key Features

- **Block-Based Editing**: Each markdown element is an editable block for precise control
- **Google Drive Sync**: Automatic background sync with your Drive folder
- **GitHub Terminal Theme**: Clean, distraction-free dark interface with Fira Code font
- **Full Markdown Support**: Headers, lists, checkboxes, code blocks, blockquotes, images, and more
- **Fast & Lightweight**: Built with performance in mind using modern React and Vite
- **Offline Ready**: Works offline with IndexedDB caching
- **Type-Safe**: 100% TypeScript with strict mode enabled

## Tech Stack

- **Framework**: React 19 + TanStack Start (SSR)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with GitHub Terminal theme
- **State Management**: TanStack Query + React Context
- **Markdown**: Marked.js + Turndown
- **Testing**: Vitest + React Testing Library
- **Build**: Vite
- **Storage**: Google Drive API + IndexedDB

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Google OAuth credentials (for Drive integration)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd markthree

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000` (default)

### Configuration

The server port and host can be configured via environment variables:

```bash
# Run on a different port
PORT=8080 npm run dev

# Run on all network interfaces (useful for Docker)
HOST=0.0.0.0 PORT=8080 npm run dev

# Or create a .env file (see .env.example)
cp .env.example .env
# Edit .env with your preferred settings
```

### Docker Deployment

MarkThree can be deployed using Docker and Docker Compose. The app runs on port 3000 internally and is exposed on port **4141** externally to avoid conflicts with other services.

#### Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Google OAuth credentials

# 2. Start with Docker Compose
docker-compose up -d

# 3. Access at http://localhost:4141
# Or http://your-server-ip:4141
```

**Key Features:**
- ✅ **Automatic database setup** - Tables created on first startup
- ✅ **Data persistence** - SQLite database stored in Docker volume
- ✅ **Zero-config** - Just run `docker-compose up -d`

#### Port Configuration

- **Internal container port**: `3000`
- **External exposed port**: `4141` (configurable in `docker-compose.yml`)
- **Why 4141?**: Avoids conflicts with other services commonly running on port 3000

To change the external port, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change 4141 to your preferred port
```

#### Data Persistence

The SQLite database is persisted using a Docker named volume `markthree_db`:

- **Inside Container**: `/app/db/sqlite.db`
- **Docker Volume**: `markthree_db` (managed by Docker)
- **Local Development**: `./sqlite.db` (in project root)

**Backup database:**

```bash
# Backup
docker run --rm \
  -v markthree_db:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/markthree-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm \
  -v markthree_db:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/markthree-backup-20250130.tar.gz -C /data
```

#### Automatic Database Setup

On container startup, the following happens automatically:

1. Database directory creation (`/app/db`)
2. Schema initialization (user, session, account, verification tables)
3. Index creation for performance
4. Server startup after database is ready

Verify initialization in logs:

```bash
docker-compose logs markthree | grep "DB Init"

# Expected output:
# [DB Init] ✅ Database initialization complete!
```

#### Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Check container status
docker-compose ps

# Check container health
docker inspect markthree-app | grep Health -A 10
```

#### Production Environment

Required environment variables for production:

```bash
# Server Configuration
PORT=3000                    # Internal port (don't change)
HOST=0.0.0.0                # Bind to all interfaces
DB_PATH=/app/db/sqlite.db   # Database path in container

# Google OAuth (required for Drive sync)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://your-server:4141/api/auth/callback/google

# Better Auth
BETTER_AUTH_SECRET=your_random_secret_key  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://your-server:4141
```

#### Production Checklist

- [ ] Configure Google OAuth credentials in Google Cloud Console
- [ ] Set `GOOGLE_REDIRECT_URI` to your production domain with port 4141
- [ ] Set `BETTER_AUTH_URL` to your production domain with port 4141
- [ ] Generate secure `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
- [ ] Set up SSL/TLS with nginx or Traefik reverse proxy
- [ ] Configure firewall to allow port 4141
- [ ] Set up automated database backups
- [ ] Configure monitoring and log rotation

#### Reverse Proxy Setup (Optional)

**Nginx:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4141;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Traefik:**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.markthree.rule=Host(`your-domain.com`)"
  - "traefik.http.services.markthree.loadbalancer.server.port=4141"
  - "traefik.http.routers.markthree.entrypoints=websecure"
  - "traefik.http.routers.markthree.tls.certresolver=letsencrypt"
```

### Building for Production

```bash
# Build both client and server
npm run build

# Preview production build
npm run preview
```

## Development

### Project Structure

```
markthree/
├── src/
│   ├── routes/           # File-based routing (TanStack Router)
│   ├── components/       # React components
│   │   ├── editor/      # BlockEditor and related
│   │   ├── layout/      # Sidebar, Header
│   │   ├── modals/      # SearchModal, etc.
│   │   └── ui/          # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Business logic
│   │   ├── auth/       # Authentication
│   │   ├── drive/      # Google Drive integration
│   │   └── markdown/   # Parser & converter
│   ├── contexts/        # React Context providers
│   ├── types/           # TypeScript definitions
│   └── test/            # Test setup
├── public/              # Static assets
└── docs/                # Documentation
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (default: localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm test -- --ui        # UI dashboard
npm test -- <file>      # Run specific test file
npm test -- --coverage  # Coverage report

# Code Quality
npm run lint            # Run oxlint
npm run format          # Check formatting with oxfmt
npm run format:fix      # Auto-fix formatting issues

# Code Quality
npm run lint            # Run oxlint
npm run format          # Check formatting
npm run format:fix      # Auto-format code
```

### Testing

MarkThree has comprehensive test coverage with **164 tests** across all core functionality:

```bash
# Run full test suite
npm test

# Test results:
✓ src/lib/utils.test.ts (25 tests)
✓ src/lib/markdown/parser.test.ts (41 tests)
✓ src/hooks/useEditor.test.tsx (28 tests)
✓ src/components/ui/button.test.tsx (33 tests)
✓ src/components/editor/BlockEditor.test.tsx (37 tests)

Test Files  5 passed (5)
Tests       164 passed (164)
Pass Rate   100%
```

See [TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md) for testing guidelines.

## Architecture Highlights

### TanStack Start SSR Patterns

- **Loaders**: Data fetching happens in route loaders (SSR + client)
- **beforeLoad**: Authentication and redirects before rendering
- **Search Params**: Type-safe URL state management
- **No useEffect for Data**: Data fetching uses loaders, not useEffect

### Block-Based Editor

Each markdown element is a `Block` with:
- Unique ID for tracking
- Block type (h1, h2, p, ul, checkbox, code, etc.)
- Content string
- Optional metadata (language, status, src, etc.)

The editor provides:
- **Real-time parsing**: Markdown ↔ Blocks conversion
- **Keyboard shortcuts**: Enter, Backspace, Tab for natural editing
- **Auto-conversion**: Type `# ` to create heading, `- [ ]` for checkbox
- **Group spacing**: Visual grouping for checkboxes, code, quotes

### Google Drive Integration

- **Single file storage**: Each document is a `.md` file
- **Naming convention**: `Title (id).md`
- **Sync strategy**: Last-write-wins (single writer per folder)
- **Conflict resolution**: Simple (no CRDT/OT complexity)
- **Clean slate**: Fresh start with modern architecture

## Key Design Decisions

### Why Block-Based?

- Precise control over each element
- Better performance (virtual scrolling per block)
- Easier to implement features like drag-drop, comments
- Clean state management (array of blocks)

### Why TanStack Start?

- Full SSR support out of the box
- Type-safe routing with file-based system
- Excellent DX with hot reload
- Built-in data fetching patterns
- Great performance

### Why Single File Storage?

- Simplicity (no complex sync logic)
- Compatibility (works with any text editor)
- Portability (easy to move/backup)
- Version control friendly (git-compatible)

## Documentation

- **[AGENTS.md](./AGENTS.md)** - Guidelines for AI coding agents
- **[TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md)** - Testing patterns & best practices
- **[TEST_SESSION_SUMMARY.md](./TEST_SESSION_SUMMARY.md)** - Complete test fixing session details
- **[TEST_CLEANUP_SUMMARY.md](./TEST_CLEANUP_SUMMARY.md)** - Console cleanup details
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Feature implementation roadmap

## Contributing

Contributions are welcome! Please:

1. Read [AGENTS.md](./AGENTS.md) for coding guidelines
2. Ensure tests pass: `npm test`
3. Follow TypeScript strict mode conventions
4. Use the established patterns for new features
5. Add tests for new functionality

### Code Style

- **TypeScript**: Strict mode, explicit return types
- **React**: Functional components, hooks only
- **Imports**: Absolute paths with `@/` prefix
- **Testing**: Template literals for markdown strings
- **Comments**: Explain _why_, not _what_

## Performance

- **Fast startup**: <2s cold start
- **Small bundle**: Code-split by route
- **Quick tests**: Full suite runs in <2 seconds
- **Efficient rendering**: Only active blocks re-render
- **Optimized images**: Lazy loading with Drive blob URLs

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security

- **OAuth 2.0**: Secure Google authentication
- **No backend**: Static app, no server to compromise
- **Drive permissions**: Request minimal scopes
- **Local storage**: Encrypted with Web Crypto API (planned)

## License

[Add your license here]

## Changelog

### Current Version (In Development)

- Block-based editor architecture
- React 19 + TanStack Start SSR
- Real-time Google Drive sync
- 100% test coverage (164 tests)
- GitHub Terminal theme
- TypeScript strict mode

## Acknowledgments

- Inspired by [MarkTwo](https://github.com/anthonygarvan/marktwo) - The original markdown editor that sparked this project
- Built with [TanStack Start](https://tanstack.com/start)
- UI inspiration from [Notion](https://notion.so) and [Bear](https://bear.app)
- Icons from [Heroicons](https://heroicons.com)
- Theme inspired by GitHub Terminal

## Links

- **Demo**: [Coming soon]
- **Documentation**: See `/docs` folder
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

---

**Status**: 🚧 In Active Development  
**Tests**: ✅ 164/164 passing (100%)  
**Build**: ✅ Production ready

---

_Built with ❤️ using modern web technologies_
