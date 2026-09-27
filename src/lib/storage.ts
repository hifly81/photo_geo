import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const uploadDir = path.join(process.cwd(), 'uploads');

export async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function writeBufferToTempFile(buffer: Buffer, originalFilename: string) {
  await ensureUploadDir();
  const ext = path.extname(originalFilename) || '';
  const tempFilename = `__temp_${randomUUID()}${ext}`;
  const tempPath = path.join(uploadDir, tempFilename);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

export async function saveUploadedFile(tempPath: string, originalFilename: string) {
  await ensureUploadDir();

  const ext = path.extname(originalFilename) || '';
  const filename = `${randomUUID()}${ext}`;
  const destination = path.join(uploadDir, filename);

  await fs.copyFile(tempPath, destination);

  return {
    filename,
    relativePath: `/api/files/${filename}`,
    absolutePath: destination
  };
}

export function resolveStoredFilePath(filename: string) {
  return path.join(uploadDir, filename);
}

export async function deleteStoredFileByRelativePath(relativePath: string) {
  const filename = relativePath.split('/').pop();
  if (!filename) return;
  const absolutePath = resolveStoredFilePath(filename);
  await fs.unlink(absolutePath).catch(() => null);
}
