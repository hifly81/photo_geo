import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, writeBufferToTempFile } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';

export const runtime = 'nodejs';

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new Error('No file uploaded');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image uploads are supported');
  }

  return file;
}

export async function POST(request: NextRequest) {
  try {
    const file = await parseFormData(request);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempPath = await writeBufferToTempFile(buffer, file.name);
    const stored = await saveUploadedFile(tempPath, file.name);
    const metadata = await extractPhotoMetadata(stored.absolutePath);

    await import('node:fs/promises').then((fs) => fs.unlink(tempPath).catch(() => null));

    const photo = await prisma.photo.create({
      data: {
        originalFilename: file.name,
        storagePath: stored.relativePath,
        source: 'upload',
        takenAt: metadata.takenAt,
        latitude: metadata.latitude,
        longitude: metadata.longitude
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
