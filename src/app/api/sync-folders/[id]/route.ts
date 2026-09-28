import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { validateSyncFolder } from '@/lib/filesystem-sync';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await prisma.syncFolder.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!existing) {
        return NextResponse.json({ error: 'Sync folder not found' }, { status: 404 });
    }

    try {
        const body = await request.json().catch(() => ({}));

        const nextStorageKey =
            typeof body.storageKey === 'string' ? body.storageKey : existing.storageKey;
        const nextFolderPath =
            typeof body.folderPath === 'string' ? body.folderPath : existing.folderPath;
        const nextEnabled =
            typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;

        const input = await validateSyncFolder(nextStorageKey, nextFolderPath);

        const folder = await prisma.syncFolder.update({
            where: { id: existing.id },
            data: {
                storageKey: input.storageKey,
                folderPath: input.folderPath,
                enabled: nextEnabled
            }
        });

        return NextResponse.json({ folder });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Could not update sync folder',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await prisma.syncFolder.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!existing) {
        return NextResponse.json({ error: 'Sync folder not found' }, { status: 404 });
    }

    await prisma.syncFolder.delete({
        where: { id: existing.id }
    });

    return NextResponse.json({ ok: true });
}