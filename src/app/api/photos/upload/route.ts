import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, writeBufferToTempFile, cleanupTempFile, calculateFileHash, deleteStoredFileByRelativePath } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';
import { uploadConstraints } from '@/lib/validators';

export const runtime = 'nodejs';

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll('files');

  if (!files.length) {
    throw new Error('No files uploaded');
  }

  const imageFiles = files.filter((file): file is File => file instanceof File && uploadConstraints.allowedMimeTypes.includes(file.type));

  if (!imageFiles.length) {
    throw new Error('Only supported image uploads are allowed');
  }

  const oversized = imageFiles.find((file) => file.size > uploadConstraints.maxFileSizeBytes);
  if (oversized) {
    throw new Error(`File too large: ${oversized.name}`);
  }

  return imageFiles;
}

export async function POST(request: NextRequest) {
  try {
    const files = await parseFormData(request);
    const createdPhotos = [];
    const duplicates = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileHash = calculateFileHash(buffer);
      const existing = await prisma.photo.findUnique({ where: { fileHash } });

      if (existing) {
        duplicates.push({ id: existing.id, originalFilename: existing.originalFilename, fileHash });
        continue;
      }

      const tempPath = await writeBufferToTempFile(buffer, file.name);
      let stored: Awaited<ReturnType<typeof saveUploadedFile>> | null = null;

      try {
        stored = await saveUploadedFile(tempPath, file.name);
        const metadata = await extractPhotoMetadata(stored.absolutePath);

        const photo = await prisma.photo.create({
          data: {
            originalFilename: file.name,
            storagePath: stored.relativePath,
            source: 'upload',
            fileHash,
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
      } catch (error) {
        if (stored) {
          await deleteStoredFileByRelativePath(stored.relativePath);
        }
        throw error;
      } finally {
        await cleanupTempFile(tempPath);
      }
    }

    return NextResponse.json({ photos: createdPhotos, duplicates }, { status: 201 });
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
