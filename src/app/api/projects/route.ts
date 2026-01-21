import { NextResponse } from 'next/server';
import { createProject, deleteProject, updateProject } from '@/lib/database';
import type { Project } from '@/types';

// POST - create a new project
export async function POST(request: Request) {
  try {
    const project: Project = await request.json();
    createProject(project);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT - update a project
export async function PUT(request: Request) {
  try {
    const project: Project = await request.json();
    updateProject(project);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE - delete a project
export async function DELETE(request: Request) {
  try {
    const { projectId } = await request.json();
    deleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
