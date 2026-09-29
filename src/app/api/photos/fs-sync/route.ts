import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { runFilesystemSync } from '@/lib/filesystem-sync';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let folderId: string | undefined;

    try {
        const body = await request.json().catch(() => null);

        if (body && typeof body.folderId === 'string' && body.folderId.trim()) {
            folderId = body.folderId.trim();
        }
    } catch {
        folderId = undefined;
    }

    const summary = await runFilesystemSync(user.id, { folderId });

    return NextResponse.json(summary);
}