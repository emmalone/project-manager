import { NextResponse } from 'next/server';
import { importFromJson } from '@/lib/database';
import type { AppState } from '@/types';

// POST - import data from JSON
export async function POST(request: Request) {
  try {
    const state: AppState = await request.json();

    // Validate the structure
    if (!state || !Array.isArray(state.projects)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    importFromJson(state);
    return NextResponse.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}
