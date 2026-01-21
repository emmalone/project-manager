import Database from 'better-sqlite3';
import path from 'path';
import type { AppState, Project, Task, Todo, Column } from '@/types';

// Database file location - in project root
const DB_PATH = path.join(process.cwd(), 'data', 'projects.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db!;

  // Projects table
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Columns table
  database.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Tasks table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    )
  `);

  // Todos table
  database.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // App state table (for active project tracking)
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active_project_id TEXT
    )
  `);

  // Initialize app state if not exists
  const stateExists = database.prepare('SELECT id FROM app_state WHERE id = 1').get();
  if (!stateExists) {
    database.prepare('INSERT INTO app_state (id, active_project_id) VALUES (1, NULL)').run();
  }
}

// Get full app state
export function getAppState(): AppState {
  const database = getDb();

  const stateRow = database.prepare('SELECT active_project_id FROM app_state WHERE id = 1').get() as { active_project_id: string | null } | undefined;
  const activeProjectId = stateRow?.active_project_id || null;

  const projectRows = database.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Array<{
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  }>;

  const projects: Project[] = projectRows.map((row) => {
    const columns = getProjectColumns(row.id);
    const tasks = getProjectTasks(row.id);
    const todos = getProjectTodos(row.id);

    // Convert tasks array to record
    const tasksRecord: Record<string, Task> = {};
    tasks.forEach((task) => {
      tasksRecord[task.id] = task;
    });

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      columns,
      tasks: tasksRecord,
      todos,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return {
    projects,
    activeProjectId,
  };
}

function getProjectColumns(projectId: string): Column[] {
  const database = getDb();
  const columnRows = database.prepare(
    'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
  ).all(projectId) as Array<{ id: string; title: string; position: number }>;

  return columnRows.map((col) => {
    const taskIds = database.prepare(
      'SELECT id FROM tasks WHERE column_id = ? ORDER BY position'
    ).all(col.id) as Array<{ id: string }>;

    return {
      id: col.id,
      title: col.title,
      taskIds: taskIds.map((t) => t.id),
    };
  });
}

function getProjectTasks(projectId: string): Task[] {
  const database = getDb();
  const taskRows = database.prepare(
    'SELECT * FROM tasks WHERE project_id = ? ORDER BY position'
  ).all(projectId) as Array<{
    id: string;
    column_id: string;
    title: string;
    description: string;
    priority: string;
    created_at: string;
  }>;

  return taskRows.map((row) => ({
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    priority: row.priority as Task['priority'],
    createdAt: row.created_at,
  }));
}

function getProjectTodos(projectId: string): Todo[] {
  const database = getDb();
  const todoRows = database.prepare(
    'SELECT * FROM todos WHERE project_id = ? ORDER BY created_at DESC'
  ).all(projectId) as Array<{
    id: string;
    title: string;
    completed: number;
    priority: string;
    created_at: string;
  }>;

  return todoRows.map((row) => ({
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    priority: row.priority as Todo['priority'],
    createdAt: row.created_at,
  }));
}

// Set active project
export function setActiveProject(projectId: string | null): void {
  const database = getDb();
  database.prepare('UPDATE app_state SET active_project_id = ? WHERE id = 1').run(projectId);
}

// Create project
export function createProject(project: Project): void {
  const database = getDb();

  const insertProject = database.prepare(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertColumn = database.prepare(`
    INSERT INTO columns (id, project_id, title, position)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    insertProject.run(
      project.id,
      project.name,
      project.description,
      project.createdAt,
      project.updatedAt
    );

    project.columns.forEach((col, index) => {
      insertColumn.run(col.id, project.id, col.title, index);
    });
  });

  transaction();
}

// Delete project
export function deleteProject(projectId: string): void {
  const database = getDb();
  database.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
}

// Update project
export function updateProject(project: Project): void {
  const database = getDb();

  const transaction = database.transaction(() => {
    // Update project
    database.prepare(`
      UPDATE projects SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(project.name, project.description, project.updatedAt, project.id);

    // Delete existing columns, tasks, todos
    database.prepare('DELETE FROM tasks WHERE project_id = ?').run(project.id);
    database.prepare('DELETE FROM columns WHERE project_id = ?').run(project.id);
    database.prepare('DELETE FROM todos WHERE project_id = ?').run(project.id);

    // Re-insert columns
    const insertColumn = database.prepare(`
      INSERT INTO columns (id, project_id, title, position) VALUES (?, ?, ?, ?)
    `);
    project.columns.forEach((col, index) => {
      insertColumn.run(col.id, project.id, col.title, index);
    });

    // Re-insert tasks
    const insertTask = database.prepare(`
      INSERT INTO tasks (id, project_id, column_id, title, description, priority, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    project.columns.forEach((col) => {
      col.taskIds.forEach((taskId, taskIndex) => {
        const task = project.tasks[taskId];
        if (task) {
          insertTask.run(
            task.id,
            project.id,
            task.columnId,
            task.title,
            task.description,
            task.priority,
            taskIndex,
            task.createdAt
          );
        }
      });
    });

    // Re-insert todos
    const insertTodo = database.prepare(`
      INSERT INTO todos (id, project_id, title, completed, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    project.todos.forEach((todo) => {
      insertTodo.run(
        todo.id,
        project.id,
        todo.title,
        todo.completed ? 1 : 0,
        todo.priority,
        todo.createdAt
      );
    });
  });

  transaction();
}

// Import from JSON (replaces all data)
export function importFromJson(state: AppState): void {
  const database = getDb();

  const transaction = database.transaction(() => {
    // Clear all existing data
    database.prepare('DELETE FROM todos').run();
    database.prepare('DELETE FROM tasks').run();
    database.prepare('DELETE FROM columns').run();
    database.prepare('DELETE FROM projects').run();

    // Import projects
    state.projects.forEach((project) => {
      createProject(project);
      // Update with full data including tasks and todos
      updateProject(project);
    });

    // Set active project
    setActiveProject(state.activeProjectId);
  });

  transaction();
}

// Export to JSON
export function exportToJson(): AppState {
  return getAppState();
}
