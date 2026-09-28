import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const DEFAULT_STORAGE_KEY = 'main';
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export type StorageRoots = Record<string, string>;

export type ScannedPhotoFile = {
  storageKey: string;
  filePath: string;
  absolutePath: string;
  originalFilename: string;
};

function parseStorageRoots(value: string | undefined): StorageRoots {
  if (!value?.trim()) {
    return {
      [DEFAULT_STORAGE_KEY]: '/photo'
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('PHOTO_STORAGE_ROOTS must be a JSON object');
    }

    const entries = Object.entries(parsed).filter((entry): entry is [string, string] => {
      const [key, rootPath] = entry;
      return Boolean(key?.trim()) && typeof rootPath === 'string' && Boolean(rootPath.trim());
    });

    if (!entries.length) {
      throw new Error('PHOTO_STORAGE_ROOTS must define at least one storage root');
    }

    return Object.fromEntries(entries.map(([key, rootPath]) => [key, path.resolve(rootPath)]));
  } catch (error) {
    throw new Error(
        error instanceof Error
            ? `Invalid PHOTO_STORAGE_ROOTS configuration: ${error.message}`
            : 'Invalid PHOTO_STORAGE_ROOTS configuration'
    );
  }
}

export function getPhotoStorageRoots(): StorageRoots {
  return parseStorageRoots(process.env.PHOTO_STORAGE_ROOTS);
}

export function getDefaultPhotoStorageKey() {
  const configured = process.env.PHOTO_DEFAULT_STORAGE_KEY?.trim();
  const roots = getPhotoStorageRoots();

  if (configured) {
    if (!(configured in roots)) {
      throw new Error(`PHOTO_DEFAULT_STORAGE_KEY references unknown storage root: ${configured}`);
    }

    return configured;
  }

  if (DEFAULT_STORAGE_KEY in roots) {
    return DEFAULT_STORAGE_KEY;
  }

  return Object.keys(roots)[0];
}

export function getUploadPhotoStorageKey() {
  const configured = process.env.PHOTO_UPLOAD_STORAGE_KEY?.trim();
  const roots = getPhotoStorageRoots();

  if (configured) {
    if (!(configured in roots)) {
      throw new Error(`PHOTO_UPLOAD_STORAGE_KEY references unknown storage root: ${configured}`);
    }

    return configured;
  }

  if ('uploads' in roots) {
    return 'uploads';
  }

  return getDefaultPhotoStorageKey();
}

export function getPhotoStorageRoot(storageKey: string) {
  const normalizedKey = storageKey.trim();
  const roots = getPhotoStorageRoots();
  const root = roots[normalizedKey];

  if (!root) {
    throw new Error(`Unknown photo storage root: ${normalizedKey}`);
  }

  return root;
}

export function normalizeRelativePhotoPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').trim().replace(/^\/+/, '');

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

export function resolvePhotoAbsolutePath(storageKey: string, filePath: string) {
  const root = getPhotoStorageRoot(storageKey);
  const normalizedPath = normalizeRelativePhotoPath(filePath);
  const absolutePath = path.resolve(root, normalizedPath);
  const relativeToRoot = path.relative(root, absolutePath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Resolved photo path escapes the configured storage root');
  }

  return absolutePath;
}

export function buildPhotoUrl(storageKey: string, filePath: string) {
  return `/api/photos/file?storage=${encodeURIComponent(storageKey)}&path=${encodeURIComponent(normalizeRelativePhotoPath(filePath))}`;
}

export async function fileExistsInStorage(storageKey: string, filePath: string) {
  const absolutePath = resolvePhotoAbsolutePath(storageKey, filePath);

  try {
    const stats = await fs.stat(absolutePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function directoryExistsInStorage(storageKey: string, directoryPath: string) {
  const absolutePath = resolvePhotoAbsolutePath(storageKey, directoryPath);

  try {
    const stats = await fs.stat(absolutePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export function isSupportedImagePath(filePath: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function scanPhotoDirectories(storageKey: string, directories: string[]) {
  const normalizedDirectories = Array.from(new Set(directories.map(normalizeRelativePhotoPath)));
  const root = getPhotoStorageRoot(storageKey);
  const scannedFiles: ScannedPhotoFile[] = [];

  async function walk(currentRelativePath: string) {
    const currentAbsolutePath = resolvePhotoAbsolutePath(storageKey, currentRelativePath);
    const entries = await fs.readdir(currentAbsolutePath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = [currentRelativePath, entry.name].filter(Boolean).join('/');
      const normalizedEntryPath = normalizeRelativePhotoPath(entryRelativePath);
      const entryAbsolutePath = path.resolve(root, normalizedEntryPath);

      if (entry.isDirectory()) {
        await walk(normalizedEntryPath);
        continue;
      }

      if (!entry.isFile() || !isSupportedImagePath(entry.name)) {
        continue;
      }

      scannedFiles.push({
        storageKey,
        filePath: normalizedEntryPath,
        absolutePath: entryAbsolutePath,
        originalFilename: entry.name
      });
    }
  }

  for (const directory of normalizedDirectories) {
    const absoluteDirectory = resolvePhotoAbsolutePath(storageKey, directory);
    const stats = await fs.stat(absoluteDirectory);

    if (!stats.isDirectory()) {
      throw new Error(`Configured scan path is not a directory: ${directory}`);
    }

    await walk(directory);
  }

  return scannedFiles.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

export async function readPhotoFile(storageKey: string, filePath: string) {
  const absolutePath = resolvePhotoAbsolutePath(storageKey, filePath);
  return fs.readFile(absolutePath);
}

export function calculateFileHash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}