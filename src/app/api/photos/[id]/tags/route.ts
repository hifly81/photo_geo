import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { photoTagSchema } from '@/lib/validators';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parseResult = photoTagSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.flatten() }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const name = parseResult.data.tagName.trim().toLowerCase();
  const tag = await prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name }
  });

  await prisma.photoTag.upsert({
    where: {
      photoId_tagId: {
        photoId: id,
        tagId: tag.id
      }
    },
    update: {},
    create: {
      photoId: id,
      tagId: tag.id
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const tagName = request.nextUrl.searchParams.get('tagName');

  if (!tagName) {
    return NextResponse.json({ error: 'tagName is required' }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({ where: { name: tagName.trim().toLowerCase() } });
  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  await prisma.photoTag.deleteMany({
    where: {
      photoId: id,
      tagId: tag.id
    }
  });

  return NextResponse.json({ ok: true });
}
