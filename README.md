# Project Manager

A full-featured project management tool for vibe coders, built with Next.js 16, Tailwind CSS, and local storage persistence.

## Features

### Kanban Board
- **Drag-and-drop tasks** between columns using @dnd-kit
- **Create custom columns** for your workflow (default: Backlog, To Do, In Progress, Done)
- **Task cards** with title, description, and priority levels (Low, Medium, High)
- **Edit and delete** tasks and columns
- **Visual priority indicators** with color-coded dots

### Todo List
- **Quick task entry** with priority selection
- **Toggle completion** with checkbox
- **Filter todos** by All, Active, or Completed
- **Progress tracking** showing completed count
- **Delete todos** when done

### Project Management
- **Multiple projects** support
- **Project sidebar** for quick switching between projects
- **Project details** with name and description
- **Local storage persistence** - all data saved automatically

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Project
1. Click the **+** button in the sidebar
2. Enter a project name and optional description
3. Click **Create**

### Managing Tasks on the Kanban Board
1. Click **Add Task** at the bottom of any column
2. Fill in the title, description (optional), and priority
3. Drag tasks between columns to update status
4. Click the edit icon to modify a task
5. Click the trash icon to delete a task

### Using the Todo List
1. Type a todo in the input field
2. Select priority level
3. Click **+** or press Enter to add
4. Click the checkbox to mark complete
5. Use filter tabs to view All/Active/Completed

### Adding Custom Columns
1. Click **Add Column** button in the header
2. Enter the column title
3. The new column appears at the end of the board

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **State Management**: React Context + useLocalStorage hook
- **TypeScript**: Full type safety
- **Unique IDs**: uuid

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── KanbanBoard.tsx   # Main kanban board with drag-drop
│   ├── KanbanColumn.tsx  # Individual column component
│   ├── TaskCard.tsx      # Draggable task card
│   ├── TaskModal.tsx     # Create/edit task modal
│   ├── TodoList.tsx      # Todo list sidebar
│   └── ProjectSidebar.tsx # Project navigation
├── context/
│   └── ProjectContext.tsx # Global state management
├── hooks/
│   └── useLocalStorage.ts # Local storage persistence hook
└── types/
    └── index.ts          # TypeScript type definitions
```

## Data Persistence

All project data is automatically saved to browser local storage. Data persists across page refreshes and browser sessions. No backend required.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
