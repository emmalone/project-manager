'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useProject } from '@/context/ProjectContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import type { Task, Priority } from '@/types';

// Custom collision detection that prioritizes columns
const customCollisionDetection: CollisionDetection = (args) => {
  // First check for pointer within droppables
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fall back to rect intersection
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // Last resort: closest center
  return closestCenter(args);
};

export function KanbanBoard() {
  const {
    activeProject,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addColumn,
    deleteColumn,
    updateColumnTitle,
  } = useProject();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No project selected</h2>
          <p className="text-gray-400">Select a project from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  const activeTask = activeTaskId ? activeProject.tasks[activeTaskId] : null;

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = activeProject.tasks[taskId];
    setActiveTaskId(taskId);
    if (task) {
      setDraggedFromColumn(task.columnId);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by useDroppable in KanbanColumn
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const activeId = active.id as string;
    const activeTask = activeProject.tasks[activeId];

    // Reset drag state
    setActiveTaskId(null);
    setDraggedFromColumn(null);

    // If no valid drop target or no active task, do nothing (task stays in original position)
    if (!over || !activeTask) {
      return;
    }

    const overId = over.id as string;

    // Find the target column - either directly dropped on column or on a task within a column
    let targetColumn = activeProject.columns.find((col) => col.id === overId);

    if (!targetColumn) {
      // Check if we're dropping on a task
      const overTask = activeProject.tasks[overId];
      if (overTask) {
        targetColumn = activeProject.columns.find((col) => col.id === overTask.columnId);
      }
    }

    // If still no target column found, don't move the task
    if (!targetColumn) {
      return;
    }

    const sourceColumn = activeProject.columns.find((col) => col.id === activeTask.columnId);
    if (!sourceColumn) {
      return;
    }

    // Only move if actually changing position
    if (sourceColumn.id === targetColumn.id && overId === activeId) {
      return;
    }

    // Calculate new index
    let newIndex = targetColumn.taskIds.length;
    if (overId !== targetColumn.id) {
      const overIndex = targetColumn.taskIds.indexOf(overId);
      if (overIndex !== -1) {
        newIndex = overIndex;
      }
    }

    moveTask(activeId, sourceColumn.id, targetColumn.id, newIndex);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setDraggedFromColumn(null);
  };

  const handleAddTask = (columnId: string) => {
    setTargetColumnId(columnId);
    setEditingTask(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTargetColumnId(task.columnId);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSaveTask = (title: string, description: string, priority: Priority) => {
    if (modalMode === 'create') {
      addTask(title, description, targetColumnId, priority);
    } else if (editingTask) {
      updateTask(editingTask.id, { title, description, priority });
    }
  };

  const handleAddColumn = () => {
    const title = prompt('Enter column title:');
    if (title && title.trim()) {
      addColumn(title.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{activeProject.name}</h1>
            {activeProject.description && (
              <p className="text-gray-500 text-sm mt-1">{activeProject.description}</p>
            )}
          </div>
          <button
            onClick={handleAddColumn}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Column
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 h-full">
            {activeProject.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={column.taskIds.map((id) => activeProject.tasks[id]).filter(Boolean)}
                onEditTask={handleEditTask}
                onDeleteTask={deleteTask}
                onAddTask={handleAddTask}
                onEditColumn={updateColumnTitle}
                onDeleteColumn={deleteColumn}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        mode={modalMode}
      />
    </div>
  );
}
