'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import type { Column, Task } from '@/types';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId: string) => void;
  onEditColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-full transition-colors ${
        isOver ? 'bg-blue-50' : ''
      }`}
    >
      <div className="p-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{column.title}</h3>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const newTitle = prompt('Enter new column title:', column.title);
              if (newTitle && newTitle.trim()) {
                onEditColumn(column.id, newTitle.trim());
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit Column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete column "${column.title}" and all its tasks?`)) {
                onDeleteColumn(column.id);
              }
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete Column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 min-h-[100px]">
        <SortableContext items={column.taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      <button
        onClick={() => onAddTask(column.id)}
        className="m-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded flex items-center justify-center gap-1 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Task
      </button>
    </div>
  );
}
