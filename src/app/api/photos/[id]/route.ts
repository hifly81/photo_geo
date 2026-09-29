import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPhotoForUser, removeOrphanTags, mapPhotoForClient } from '@/lib/photos';
import { updatePhotoSchema, bulkUpdatePhotosSchema } from '@/lib/validators';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const photo = await getPhotoForUser(id, user.id);

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  return NextResponse.json({ photo: mapPhotoForClient(photo) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parseResult = updatePhotoSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.flatten() }, { status: 400 });
  }

  const data = parseResult.data;

  const existing = await prisma.photo.findFirst({
    where: {
      id,
      userId: user.id
    }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      caption: data.caption ?? existing.caption,
      country: data.country ?? existing.country,
      city: data.city ?? existing.city,
      placeName: data.placeName ?? existing.placeName,
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

  return NextResponse.json({ photo: mapPhotoForClient(photo) });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.photo.findFirst({
    where: {
      id,
      userId: user.id
    }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.photoTag.deleteMany({ where: { photoId: id } });
    await tx.photo.delete({ where: { id } });
  });

  await removeOrphanTags();

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = bulkUpdatePhotosSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { ids, city, country, placeName, latitude, longitude } = parseResult.data;

  const result = await prisma.photo.updateMany({
    where: {
      id: { in: ids },
      userId: user.id
    },
    data: {
      city,
      country,
      placeName,
      latitude,
      longitude
    }
  });

  return NextResponse.json({ ok: true, updated: result.count });
}