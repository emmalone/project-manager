'use client';

import { ProjectSidebar } from '@/components/ProjectSidebar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TodoList } from '@/components/TodoList';
import { ProjectProvider } from '@/context/ProjectContext';

export default function Home() {
  return (
    <ProjectProvider>
      <div className="flex h-screen overflow-hidden">
        <ProjectSidebar />
        <KanbanBoard />
        <TodoList />
      </div>
    </ProjectProvider>
  );
}
