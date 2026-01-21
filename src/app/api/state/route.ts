import { NextResponse } from 'next/server';
import { getAppState, setActiveProject } from '@/lib/database';

// GET - fetch full app state
export async function GET() {
  try {
    const state = getAppState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}

// PATCH - update active project
export async function PATCH(request: Request) {
  try {
    const { activeProjectId } = await request.json();
    setActiveProject(activeProjectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating active project:', error);
    return NextResponse.json({ error: 'Failed to update active project' }, { status: 500 });
  }
}
