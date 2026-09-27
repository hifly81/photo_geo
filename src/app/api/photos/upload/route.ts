import { NextRequest, NextResponse } from 'next/server';
import { IncomingForm } from 'formidable';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';

export const runtime = 'nodejs';

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new Error('No file uploaded');
  }

  return file;
}

export async function POST(request: NextRequest) {
  try {
    const file = await parseFormData(request);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempPath = `${process.cwd()}/uploads/__temp_${Date.now()}_${file.name}`;
    await import('node:fs/promises').then((fs) => fs.writeFile(tempPath, buffer));

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
