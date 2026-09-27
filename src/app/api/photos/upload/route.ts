import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, writeBufferToTempFile, cleanupTempFile } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';

export const runtime = 'nodejs';

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll('files');

  if (!files.length) {
    throw new Error('No files uploaded');
  }

  const imageFiles = files.filter((file): file is File => file instanceof File && file.type.startsWith('image/'));

  if (!imageFiles.length) {
    throw new Error('Only image uploads are supported');
  }

  return imageFiles;
}

export async function POST(request: NextRequest) {
  try {
    const files = await parseFormData(request);
    const createdPhotos = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const tempPath = await writeBufferToTempFile(buffer, file.name);

      try {
        const stored = await saveUploadedFile(tempPath, file.name);
        const metadata = await extractPhotoMetadata(stored.absolutePath);

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

        createdPhotos.push(photo);
      } finally {
        await cleanupTempFile(tempPath);
      }
    }

    return NextResponse.json({ photos: createdPhotos }, { status: 201 });
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
