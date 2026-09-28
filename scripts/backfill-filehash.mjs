import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
const DEFAULT_STORAGE_KEY = 'main';

function parseStorageRoots(value) {
  if (!value?.trim()) {
    return {
      [DEFAULT_STORAGE_KEY]: '/photo'
    };
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('PHOTO_STORAGE_ROOTS must be a JSON object');
    }

    const entries = Object.entries(parsed).filter(([key, rootPath]) => {
      return Boolean(key?.trim()) && typeof rootPath === 'string' && Boolean(rootPath.trim());
    });

    if (!entries.length) {
      throw new Error('PHOTO_STORAGE_ROOTS must define at least one storage root');
    }

    return Object.fromEntries(
        entries.map(([key, rootPath]) => [key, path.resolve(rootPath)])
    );
  } catch (error) {
    throw new Error(
        error instanceof Error
            ? `Invalid PHOTO_STORAGE_ROOTS configuration: ${error.message}`
            : 'Invalid PHOTO_STORAGE_ROOTS configuration'
    );
  }
}

function getPhotoStorageRoots() {
  return parseStorageRoots(process.env.PHOTO_STORAGE_ROOTS);
}

function getPhotoStorageRoot(storageKey) {
  const normalizedKey = String(storageKey ?? '').trim();
  const roots = getPhotoStorageRoots();
  const root = roots[normalizedKey];

  if (!root) {
    throw new Error(`Unknown photo storage root: ${normalizedKey}`);
  }

  return root;
}

function normalizeRelativePhotoPath(filePath) {
  const normalized = String(filePath ?? '')
      .replace(/\\/g, '/')
      .trim()
      .replace(/^\/+/, '');

  if (!normalized) {
    throw new Error('Photo path is required');
  }

  if (path.isAbsolute(normalized)) {
    throw new Error('Photo path must be relative to the selected storage root');
  }

  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Photo path contains invalid path traversal segments');
  }

  return segments.join('/');
}

function resolvePhotoAbsolutePath(storageKey, filePath) {
  const root = getPhotoStorageRoot(storageKey);
  const normalizedPath = normalizeRelativePhotoPath(filePath);
  const absolutePath = path.resolve(root, normalizedPath);
  const relativeToRoot = path.relative(root, absolutePath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Resolved photo path escapes the configured storage root');
  }

  return absolutePath;
}

async function readPhotoFile(storageKey, filePath) {
  const absolutePath = resolvePhotoAbsolutePath(storageKey, filePath);
  return fs.readFile(absolutePath);
}

function calculateFileHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const photos = await prisma.photo.findMany({
    where: {
      fileHash: null
    },
    select: {
      id: true,
      storageKey: true,
      filePath: true
    }
  });

  let updated = 0;
  let skipped = 0;

  for (const photo of photos) {
    try {
      const buffer = await readPhotoFile(photo.storageKey, photo.filePath);
      const fileHash = calculateFileHash(buffer);

      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          fileHash
        }
      });

      updated += 1;
    } catch (error) {
      skipped += 1;
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
          `Skipping photo ${photo.id} (${photo.storageKey}:${photo.filePath}): ${reason}`
      );
    }
  }

  console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}`);
}

main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });