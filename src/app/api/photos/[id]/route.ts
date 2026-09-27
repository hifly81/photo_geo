import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPhoto, removeOrphanTags } from '@/lib/photos';
import { updatePhotoSchema } from '@/lib/validators';
import { deleteStoredFileByRelativePath } from '@/lib/storage';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const photo = await getPhoto(id);

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  return NextResponse.json({ photo });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parseResult = updatePhotoSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.flatten() }, { status: 400 });
  }

  const data = parseResult.data;

  const existing = await prisma.photo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      caption: data.caption ?? existing.caption,
      country: data.country ?? existing.country,
      city: data.city ?? existing.city,
      latitude: data.latitude ?? existing.latitude,
      longitude: data.longitude ?? existing.longitude,
      takenAt: data.takenAt !== undefined ? (data.takenAt ? new Date(data.takenAt) : null) : existing.takenAt
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  return NextResponse.json({ photo });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await prisma.photo.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.photoTag.deleteMany({ where: { photoId: id } });
    await tx.photo.delete({ where: { id } });
  });

  await deleteStoredFileByRelativePath(existing.storagePath);
  await removeOrphanTags();

  return NextResponse.json({ ok: true });
}
