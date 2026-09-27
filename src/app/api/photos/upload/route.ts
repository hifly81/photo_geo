import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, writeBufferToTempFile, cleanupTempFile, calculateFileHash, deleteStoredFileByRelativePath } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';
import { uploadConstraints } from '@/lib/validators';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

type FailedUpload = {
  name: string;
  error: string;
};

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

  return imageFiles;
}

export async function POST(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const files = await parseFormData(request);
    const createdPhotos = [];
    const duplicates = [];
    const failed: FailedUpload[] = [];

    for (const file of files) {
      const normalizedOriginalFilename = file.name.trim();

      if (file.size > uploadConstraints.maxFileSizeBytes) {
        failed.push({
          name: normalizedOriginalFilename || 'unnamed-file',
          error: `File too large. Max size is ${Math.round(uploadConstraints.maxFileSizeBytes / (1024 * 1024))}MB.`
        });
        continue;
      }

      let tempPath: string | null = null;
      let stored: Awaited<ReturnType<typeof saveUploadedFile>> | null = null;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileHash = calculateFileHash(buffer);
        const existing = await prisma.photo.findFirst({
          where: {
            userId: user.id,
            OR: [
              { fileHash },
              { originalFilename: normalizedOriginalFilename }
            ]
          }
        });

        if (existing) {
          duplicates.push({
            id: existing.id,
            originalFilename: existing.originalFilename,
            fileHash: existing.fileHash,
            reason: existing.originalFilename === normalizedOriginalFilename ? 'path' : 'hash'
          });
          continue;
        }

        tempPath = await writeBufferToTempFile(buffer, normalizedOriginalFilename);
        stored = await saveUploadedFile(tempPath, normalizedOriginalFilename);
        const metadata = await extractPhotoMetadata(stored.absolutePath);

        const photo = await prisma.photo.create({
          data: {
            userId: user.id,
            originalFilename: normalizedOriginalFilename,
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

        failed.push({
          name: normalizedOriginalFilename || 'unnamed-file',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        if (tempPath) {
          await cleanupTempFile(tempPath);
        }
      }
    }

    return NextResponse.json({ photos: createdPhotos, duplicates, failed }, { status: 201 });
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
