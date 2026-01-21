# Project Documentation

## Purpose

Project Manager is a web-based project management tool designed for vibe coders who need a simple, local-first way to organize tasks using a Kanban board and todo list. It provides a clean, minimal interface for managing multiple projects without requiring cloud services or accounts.

## Current Status

**MVP Complete** - All core features are implemented and working. The application is stable for local development and personal use. Storage has been upgraded from localStorage to SQLite for improved data management and portability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Tailwind CSS v4)                      │
│  ├── ProjectSidebar    - Project list, import/export        │
│  ├── KanbanBoard       - Drag-and-drop task management      │
│  │   ├── KanbanColumn  - Individual columns                 │
│  │   └── TaskCard      - Draggable task cards               │
│  ├── TodoList          - Quick tasks with promote-to-board  │
│  └── TaskModal         - Create/edit task dialog            │
├─────────────────────────────────────────────────────────────┤
│  State Management (React Context)                           │
│  └── ProjectContext    - Centralized state, optimistic UI   │
├─────────────────────────────────────────────────────────────┤
│  API Routes (/api/*)                                        │
│  ├── /state            - GET app state, PATCH active project│
│  ├── /projects         - POST create, PUT update, DELETE    │
│  ├── /export           - GET all data as JSON               │
│  └── /import           - POST restore from JSON             │
├─────────────────────────────────────────────────────────────┤
│  Persistence Layer                                          │
│  └── database.ts       - SQLite via better-sqlite3          │
│      └── data/projects.db (WAL mode)                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 16 (App Router) | Server/client rendering, API routes |
| UI | React 19 | Component architecture |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable | Accessible DnD interactions |
| Database | better-sqlite3 | Local SQLite persistence |
| IDs | uuid | Unique identifier generation |
| Types | TypeScript | Type safety |

## Key Decisions

- **SQLite over localStorage**
  - Rationale: Enables larger datasets, proper relational queries, and file-based data portability
  - Alternatives: localStorage (limited to ~5MB, string-only), IndexedDB (more complex API)

- **@dnd-kit for drag-and-drop**
  - Rationale: Modern, accessible, React 18/19 compatible, good TypeScript support
  - Alternatives: react-beautiful-dnd (deprecated), react-dnd (more complex setup)

- **Optimistic UI updates**
  - Rationale: Better user experience with instant feedback; API calls run in background
  - All mutations update local state first, then persist to database

- **Custom collision detection for drag-drop**
  - Rationale: Default detection caused tasks to disappear when dropped outside columns
  - Solution: Multi-strategy approach (pointerWithin → rectIntersection → closestCenter)

- **JSON import/export**
  - Rationale: Data portability between machines, backup capability
  - Full state export/import preserves all projects, tasks, todos

## Configuration & Environment

### Requirements
- Node.js 18+
- npm or compatible package manager

### Environment Variables
None required. The application runs entirely locally with no external service dependencies.

### Database
- Location: `data/projects.db`
- Auto-created on first API call
- Uses WAL (Write-Ahead Logging) mode for performance
- Gitignored to prevent committing user data

### Dependencies
```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "better-sqlite3": "^12.6.2",
  "next": "16.1.4",
  "react": "19.2.3",
  "tailwindcss": "^4",
  "uuid": "^13.0.0"
}
```

## Work Completed

### Core Features
- [x] Multiple project support with sidebar navigation
- [x] Kanban board with 4 default columns (Backlog, To Do, In Progress, Done)
- [x] Drag-and-drop task movement between columns
- [x] Task CRUD (create, read, update, delete)
- [x] Priority levels (Low, Medium, High) with visual indicators
- [x] Custom column creation and deletion
- [x] Column title editing

### Todo List
- [x] Quick task entry with priority selection
- [x] Toggle completion status
- [x] Filter by All/Active/Completed
- [x] Promote todo to Kanban board task
- [x] Delete todos

### Data Management
- [x] SQLite database persistence
- [x] JSON export (download all data)
- [x] JSON import (restore from backup)
- [x] Optimistic UI with background sync

### UI/UX
- [x] Dark sidebar with light main area
- [x] Responsive layout
- [x] Loading states
- [x] Error handling with console logging

## Open Items / Next Steps

### Potential Enhancements
- [ ] Task due dates
- [ ] Task labels/tags
- [ ] Search/filter tasks
- [ ] Keyboard shortcuts
- [ ] Undo/redo support

### Known Limitations
- Single-user only (no authentication)
- No real-time sync between devices
- Database file not encrypted

### Technical Debt
- README.md references old localStorage architecture (needs update)
- useLocalStorage hook still exists but is unused

## Change Log

### 2026-01-21
- Initial DOCUMENTATION.md created
- Documented complete architecture including SQLite migration
- Captured all key decisions and rationale
- Listed all completed features and open items
