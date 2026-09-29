import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { validateSyncFolder } from '@/lib/filesystem-sync';

export const runtime = 'nodejs';

export async function GET() {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await prisma.syncFolder.findMany({
        where: { userId: user.id },
        orderBy: [
            { enabled: 'desc' },
            { folderPath: 'asc' }
        ]
    });

    return NextResponse.json({ folders });
}

export async function POST(request: NextRequest) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const input = await validateSyncFolder(
            typeof body.storageKey === 'string' ? body.storageKey : '',
            typeof body.folderPath === 'string' ? body.folderPath : ''
        );

        const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;

        const folder = await prisma.syncFolder.create({
            data: {
                userId: user.id,
                storageKey: input.storageKey,
                folderPath: input.folderPath,
                enabled
            }
        });

        return NextResponse.json({ folder }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Could not create sync folder',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}