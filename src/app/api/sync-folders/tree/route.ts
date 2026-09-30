import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { listAvailableSyncDirectories } from '@/lib/filesystem-sync';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storageKey = request.nextUrl.searchParams.get('storageKey')?.trim() ?? '';

    if (!storageKey) {
        return NextResponse.json({ error: 'Storage key is required' }, { status: 400 });
    }

    try {
        const existingFolders = await prisma.syncFolder.findMany({
            where: {
                userId: user.id,
                storageKey
            },
            select: {
                folderPath: true
            }
        });

        const directories = await listAvailableSyncDirectories(
            storageKey,
            existingFolders.map((folder) => folder.folderPath)
        );

        return NextResponse.json({ directories });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Could not load filesystem tree',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}