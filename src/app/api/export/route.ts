import { NextResponse } from 'next/server';
import { exportToJson } from '@/lib/database';

// GET - export all data as JSON
export async function GET() {
  try {
    const state = exportToJson();
    return NextResponse.json(state, {
      headers: {
        'Content-Disposition': `attachment; filename="project-manager-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
