'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  isLoading: boolean;
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
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  refreshState: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  const activeProject = state.activeProjectId
    ? state.projects.find((p) => p.id === state.activeProjectId) || null
    : null;

  // Fetch initial state from API
  const refreshState = useCallback(async () => {
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        const data = await response.json();
        setState(data);
      }
    } catch (error) {
      console.error('Error fetching state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Helper to update project in API
  const saveProject = useCallback(async (project: Project) => {
    try {
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }, []);

  const createProject = useCallback(async (name: string, description: string) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      columns: defaultColumns.map(col => ({ ...col, taskIds: [] })),
      tasks: {},
      todos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: newProject.id,
    }));

    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      await fetch('/api/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProjectId: newProject.id }),
      });
    } catch (error) {
      console.error('Error creating project:', error);
      refreshState();
    }
  }, [refreshState]);

  const deleteProject = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
    }));

    try {
      await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      if (state.activeProjectId === id) {
        await fetch('/api/state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeProjectId: null }),
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      refreshState();
    }
  }, [state.activeProjectId, refreshState]);

  const setActiveProjectFn = useCallback(async (id: string | null) => {
    setState((prev) => ({ ...prev, activeProjectId: id }));

    try {
      await fetch('/api/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProjectId: id }),
      });
    } catch (error) {
      console.error('Error setting active project:', error);
    }
  }, []);

  const updateProjectLocal = useCallback((projectId: string, updater: (project: Project) => Project) => {
    let updatedProject: Project | null = null;
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === projectId) {
          updatedProject = { ...updater(p), updatedAt: new Date().toISOString() };
          return updatedProject;
        }
        return p;
      }),
    }));
    return updatedProject;
  }, []);

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
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      tasks: { ...project.tasks, [taskId]: newTask },
      columns: project.columns.map((col) =>
        col.id === columnId ? { ...col, taskIds: [...col.taskIds, taskId] } : col
      ),
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      tasks: {
        ...project.tasks,
        [taskId]: { ...project.tasks[taskId], ...updates },
      },
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const deleteTask = useCallback((taskId: string) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => {
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
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const moveTask = useCallback((taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => {
      const task = project.tasks[taskId];
      if (!task) {
        console.error('moveTask: Task not found:', taskId);
        return project;
      }

      const fromColumn = project.columns.find(c => c.id === fromColumnId);
      const toColumn = project.columns.find(c => c.id === toColumnId);
      if (!fromColumn || !toColumn) {
        console.error('moveTask: Column not found:', { fromColumnId, toColumnId });
        return project;
      }

      if (fromColumnId === toColumnId) {
        const currentIndex = fromColumn.taskIds.indexOf(taskId);
        if (currentIndex === newIndex || currentIndex === newIndex - 1) {
          return project;
        }
      }

      const newColumns = project.columns.map((col) => {
        if (col.id === fromColumnId && col.id === toColumnId) {
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
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const addTodo = useCallback((title: string, priority: Priority) => {
    if (!state.activeProjectId) return;
    const newTodo: Todo = {
      id: uuidv4(),
      title,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      todos: [...project.todos, newTodo],
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const toggleTodo = useCallback((todoId: string) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      todos: project.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const deleteTodo = useCallback((todoId: string) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      todos: project.todos.filter((todo) => todo.id !== todoId),
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const addColumn = useCallback((title: string) => {
    if (!state.activeProjectId) return;
    const newColumn: Column = {
      id: uuidv4(),
      title,
      taskIds: [],
    };
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      columns: [...project.columns, newColumn],
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const deleteColumn = useCallback((columnId: string) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => {
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
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const updateColumnTitle = useCallback((columnId: string, title: string) => {
    if (!state.activeProjectId) return;
    const updatedProject = updateProjectLocal(state.activeProjectId, (project) => ({
      ...project,
      columns: project.columns.map((col) =>
        col.id === columnId ? { ...col, title } : col
      ),
    }));
    if (updatedProject) saveProject(updatedProject);
  }, [state.activeProjectId, updateProjectLocal, saveProject]);

  const exportData = useCallback(async () => {
    try {
      const response = await fetch('/api/export');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-manager-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await refreshState();
        alert('Data imported successfully');
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data. Please check the file format.');
    }
  }, [refreshState]);

  return (
    <ProjectContext.Provider
      value={{
        state,
        activeProject,
        isLoading,
        createProject,
        deleteProject,
        setActiveProject: setActiveProjectFn,
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
        exportData,
        importData,
        refreshState,
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
