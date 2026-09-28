import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { syncFilesystemPhotosForUser } from '@/lib/filesystem-sync';

export const runtime = 'nodejs';

export async function POST() {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const summary = await syncFilesystemPhotosForUser(user.id);
        return NextResponse.json(summary);
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Filesystem sync failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}