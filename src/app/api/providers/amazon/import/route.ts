import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { getAmazonProviderAccount } from '@/lib/amazon-photos';
import { calculateFileHash, cleanupTempFile, deleteStoredFileByRelativePath, saveUploadedFile, writeBufferToTempFile } from '@/lib/storage';
import { extractPhotoMetadata } from '@/lib/exif';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await getAmazonProviderAccount(user.id);

  if (!account) {
    return NextResponse.json({ error: 'Amazon Photos not connected' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];

  const imported = [];
  const duplicates = [];

  for (const item of items) {
    const id = typeof item.id === 'string' ? item.id : '';
    const filename = typeof item.filename === 'string' ? item.filename : 'amazon-photo.jpg';
    const downloadUrl = typeof item.downloadUrl === 'string' ? item.downloadUrl : '';

    if (!id || !downloadUrl) {
      continue;
    }

    const existing = await prisma.photo.findFirst({
      where: {
        userId: user.id,
        source: 'amazon_photos',
        sourceItemId: id
      }
    });

    if (existing) {
      duplicates.push({ id: existing.id, sourceItemId: id, reason: 'sourceItemId' });
      continue;
    }

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`
      }
    });

    if (!downloadResponse.ok) {
      continue;
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = calculateFileHash(buffer);

    const duplicateByHash = await prisma.photo.findFirst({
      where: {
        userId: user.id,
        fileHash
      }
    });

    if (duplicateByHash) {
      duplicates.push({ id: duplicateByHash.id, sourceItemId: id, reason: 'fileHash' });
      continue;
    }

    const tempPath = await writeBufferToTempFile(buffer, filename);
    let stored: Awaited<ReturnType<typeof saveUploadedFile>> | null = null;

    try {
      stored = await saveUploadedFile(tempPath, filename);
      const metadata = await extractPhotoMetadata(stored.absolutePath);

      const photo = await prisma.photo.create({
        data: {
          userId: user.id,
          originalFilename: filename,
          storagePath: stored.relativePath,
          source: 'amazon_photos',
          sourceItemId: id,
          fileHash,
          takenAt: metadata.takenAt,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          caption: typeof item.description === 'string' ? item.description : null
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      imported.push(photo);
    } catch {
      if (stored) {
        await deleteStoredFileByRelativePath(stored.relativePath);
      }
    } finally {
      await cleanupTempFile(tempPath);
    }
  }

  return NextResponse.json({ imported, duplicates }, { status: 201 });
}
