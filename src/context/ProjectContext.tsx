'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { AppState, Project, Task, Todo, Column, Priority } from '@/types';

const defaultColumns: Column[] = [
  { id: 'backlog', title: 'Backlog', taskIds: [] },
  { id: 'todo', title: 'To Do', taskIds: [] },
  { id: 'in-progress', title: 'In Progress', taskIds: [] },
  { id: 'done', title: 'Done', taskIds: [] },
];

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
};

interface ProjectContextType {
  state: AppState;
  activeProject: Project | null;
  createProject: (name: string, description: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  addTask: (title: string, description: string, columnId: string, priority: Priority) => void;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  addTodo: (title: string, priority: Priority) => void;
  toggleTodo: (todoId: string) => void;
  deleteTodo: (todoId: string) => void;
  addColumn: (title: string) => void;
  deleteColumn: (columnId: string) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useLocalStorage<AppState>('project-manager-state', initialState);

  const activeProject = state.activeProjectId
    ? state.projects.find((p) => p.id === state.activeProjectId) || null
    : null;

  const createProject = useCallback((name: string, description: string) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      columns: [...defaultColumns],
      tasks: {},
      todos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: newProject.id,
    }));
  }, [setState]);

  const deleteProject = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
    }));
  }, [setState]);

  const setActiveProject = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeProjectId: id }));
  }, [setState]);

  const updateProject = useCallback((projectId: string, updater: (project: Project) => Project) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...updater(p), updatedAt: new Date().toISOString() } : p
      ),
    }));
  }, [setState]);

  const addTask = useCallback((title: string, description: string, columnId: string, priority: Priority) => {
    if (!state.activeProjectId) return;
    const taskId = uuidv4();
    const newTask: Task = {
      id: taskId,
      title,
      description,
      priority,
      columnId,
      createdAt: new Date().toISOString(),
    };
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      tasks: { ...project.tasks, [taskId]: newTask },
      columns: project.columns.map((col) =>
        col.id === columnId ? { ...col, taskIds: [...col.taskIds, taskId] } : col
      ),
    }));
  }, [state.activeProjectId, updateProject]);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      tasks: {
        ...project.tasks,
        [taskId]: { ...project.tasks[taskId], ...updates },
      },
    }));
  }, [state.activeProjectId, updateProject]);

  const deleteTask = useCallback((taskId: string) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => {
      const task = project.tasks[taskId];
      if (!task) return project;
      const { [taskId]: _removed, ...remainingTasks } = project.tasks;
      return {
        ...project,
        tasks: remainingTasks,
        columns: project.columns.map((col) =>
          col.id === task.columnId
            ? { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) }
            : col
        ),
      };
    });
  }, [state.activeProjectId, updateProject]);

  const moveTask = useCallback((taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => {
      // Validate task exists
      const task = project.tasks[taskId];
      if (!task) {
        console.error('moveTask: Task not found:', taskId);
        return project;
      }

      // Validate columns exist
      const fromColumn = project.columns.find(c => c.id === fromColumnId);
      const toColumn = project.columns.find(c => c.id === toColumnId);
      if (!fromColumn || !toColumn) {
        console.error('moveTask: Column not found:', { fromColumnId, toColumnId });
        return project;
      }

      // If same position, don't change anything
      if (fromColumnId === toColumnId) {
        const currentIndex = fromColumn.taskIds.indexOf(taskId);
        if (currentIndex === newIndex || currentIndex === newIndex - 1) {
          return project;
        }
      }

      const newColumns = project.columns.map((col) => {
        if (col.id === fromColumnId && col.id === toColumnId) {
          // Moving within the same column
          const taskIds = col.taskIds.filter((id) => id !== taskId);
          taskIds.splice(newIndex, 0, taskId);
          return { ...col, taskIds };
        }
        if (col.id === fromColumnId) {
          return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
        }
        if (col.id === toColumnId) {
          const newTaskIds = [...col.taskIds.filter((id) => id !== taskId)];
          newTaskIds.splice(newIndex, 0, taskId);
          return { ...col, taskIds: newTaskIds };
        }
        return col;
      });

      return {
        ...project,
        columns: newColumns,
        tasks: {
          ...project.tasks,
          [taskId]: { ...task, columnId: toColumnId },
        },
      };
    });
  }, [state.activeProjectId, updateProject]);

  const addTodo = useCallback((title: string, priority: Priority) => {
    if (!state.activeProjectId) return;
    const newTodo: Todo = {
      id: uuidv4(),
      title,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      todos: [...project.todos, newTodo],
    }));
  }, [state.activeProjectId, updateProject]);

  const toggleTodo = useCallback((todoId: string) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      todos: project.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
  }, [state.activeProjectId, updateProject]);

  const deleteTodo = useCallback((todoId: string) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      todos: project.todos.filter((todo) => todo.id !== todoId),
    }));
  }, [state.activeProjectId, updateProject]);

  const addColumn = useCallback((title: string) => {
    if (!state.activeProjectId) return;
    const newColumn: Column = {
      id: uuidv4(),
      title,
      taskIds: [],
    };
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      columns: [...project.columns, newColumn],
    }));
  }, [state.activeProjectId, updateProject]);

  const deleteColumn = useCallback((columnId: string) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => {
      const column = project.columns.find((c) => c.id === columnId);
      if (!column) return project;
      const tasksToRemove = column.taskIds;
      const newTasks = { ...project.tasks };
      tasksToRemove.forEach((taskId) => delete newTasks[taskId]);
      return {
        ...project,
        columns: project.columns.filter((c) => c.id !== columnId),
        tasks: newTasks,
      };
    });
  }, [state.activeProjectId, updateProject]);

  const updateColumnTitle = useCallback((columnId: string, title: string) => {
    if (!state.activeProjectId) return;
    updateProject(state.activeProjectId, (project) => ({
      ...project,
      columns: project.columns.map((col) =>
        col.id === columnId ? { ...col, title } : col
      ),
    }));
  }, [state.activeProjectId, updateProject]);

  return (
    <ProjectContext.Provider
      value={{
        state,
        activeProject,
        createProject,
        deleteProject,
        setActiveProject,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        addTodo,
        toggleTodo,
        deleteTodo,
        addColumn,
        deleteColumn,
        updateColumnTitle,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
