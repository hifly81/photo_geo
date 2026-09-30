import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import exifr from 'exifr';
import { prisma } from '@/lib/prisma';
import { getPhotoStorageRoot, resolvePhotoAbsolutePath } from '@/lib/filesystem-storage';

type RunFilesystemSyncOptions = {
    folderId?: string;
};

export type FilesystemSyncSummary = {
    scannedFolders: number;
    scannedFiles: number;
    created: number;
    updated: number;
    skipped: number;
    missingMarked: number;
    errors: Array<{
        storageKey: string;
        folderPath: string;
        error: string;
    }>;
};

type ExifCoordinates = {
    latitude: number | null;
    longitude: number | null;
    takenAt: Date | null;
};

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isSupportedImageFile(filePath: string) {
    return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function walkDirectoryRecursive(absoluteDir: string): Promise<string[]> {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const absoluteEntryPath = path.join(absoluteDir, entry.name);

        if (entry.isDirectory()) {
            files.push(...await walkDirectoryRecursive(absoluteEntryPath));
            continue;
        }

        if (entry.isFile() && isSupportedImageFile(entry.name)) {
            files.push(absoluteEntryPath);
        }
    }

    return files;
}

async function walkDirectoriesRecursive(
    absoluteDir: string,
    storageRoot: string
): Promise<string[]> {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    const directories: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const absoluteEntryPath = path.join(absoluteDir, entry.name);
        const relativePath = path.relative(storageRoot, absoluteEntryPath).split(path.sep).join('/');

        directories.push(relativePath);
        directories.push(...await walkDirectoriesRecursive(absoluteEntryPath, storageRoot));
    }

    return directories;
}

async function sha256File(absolutePath: string) {
    const fileBuffer = await fs.readFile(absolutePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function readExifCoordinates(absolutePath: string): Promise<ExifCoordinates> {
    try {
        const metadata = await exifr.parse(absolutePath, {
            gps: true,
            tiff: true,
            exif: true
        });

        const latitude =
            typeof metadata?.latitude === 'number' && Number.isFinite(metadata.latitude)
                ? metadata.latitude
                : null;

        const longitude =
            typeof metadata?.longitude === 'number' && Number.isFinite(metadata.longitude)
                ? metadata.longitude
                : null;

        const takenAt =
            metadata?.DateTimeOriginal instanceof Date
                ? metadata.DateTimeOriginal
                : metadata?.CreateDate instanceof Date
                    ? metadata.CreateDate
                    : null;

        return { latitude, longitude, takenAt };
    } catch {
        return { latitude: null, longitude: null, takenAt: null };
    }
}

function normalizeFolderPath(folderPath: string) {
    const normalized = folderPath.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
    return normalized === '.' ? '' : normalized;
}

function toRelativeStoragePath(storageRoot: string, absoluteFilePath: string) {
    const relativePath = path.relative(storageRoot, absoluteFilePath);
    return relativePath.split(path.sep).join('/');
}

function matchesFolderPrefix(filePath: string, folderPath: string) {
    const normalizedFilePath = filePath.replaceAll('\\', '/');
    const normalizedFolderPath = normalizeFolderPath(folderPath);

    if (!normalizedFolderPath) {
        return true;
    }

    return (
        normalizedFilePath === normalizedFolderPath ||
        normalizedFilePath.startsWith(`${normalizedFolderPath}/`)
    );
}

function isSameOrNestedFolder(folderPath: string, configuredFolderPath: string) {
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    const normalizedConfiguredFolderPath = normalizeFolderPath(configuredFolderPath);

    if (!normalizedConfiguredFolderPath) {
        return true;
    }

    return (
        normalizedFolderPath === normalizedConfiguredFolderPath ||
        normalizedFolderPath.startsWith(`${normalizedConfiguredFolderPath}/`)
    );
}

export async function validateSyncFolder(storageKey: string, folderPath: string) {
    const trimmedStorageKey = storageKey.trim();
    const normalizedFolderPath = normalizeFolderPath(folderPath);

    if (!trimmedStorageKey) {
        throw new Error('Storage key is required');
    }

    const storageRoot = getPhotoStorageRoot(trimmedStorageKey);
    const absoluteFolderPath = normalizedFolderPath
        ? path.join(storageRoot, normalizedFolderPath)
        : storageRoot;

    const resolvedAbsoluteFolderPath = path.resolve(absoluteFolderPath);
    const resolvedStorageRoot = path.resolve(storageRoot);

    if (
        resolvedAbsoluteFolderPath !== resolvedStorageRoot &&
        !resolvedAbsoluteFolderPath.startsWith(`${resolvedStorageRoot}${path.sep}`)
    ) {
        throw new Error('Folder path must stay inside the configured storage root');
    }

    let stats;
    try {
        stats = await fs.stat(resolvedAbsoluteFolderPath);
    } catch {
        throw new Error('Folder does not exist');
    }

    if (!stats.isDirectory()) {
        throw new Error('Configured path is not a directory');
    }

    return {
        storageKey: trimmedStorageKey,
        folderPath: normalizedFolderPath
    };
}

export async function listAvailableSyncDirectories(
    storageKey: string,
    excludedFolderPaths: string[] = []
) {
    const trimmedStorageKey = storageKey.trim();

    if (!trimmedStorageKey) {
        throw new Error('Storage key is required');
    }

    const storageRoot = getPhotoStorageRoot(trimmedStorageKey);
    const directories = ['.', ...(await walkDirectoriesRecursive(storageRoot, storageRoot))];
    const normalizedExcludedFolderPaths = excludedFolderPaths.map((folderPath) => normalizeFolderPath(folderPath));

    return directories
        .map((folderPath) => normalizeFolderPath(folderPath))
        .filter((folderPath, index, items) => items.indexOf(folderPath) === index)
        .filter(
            (folderPath) =>
                !normalizedExcludedFolderPaths.some((configuredFolderPath) =>
                    isSameOrNestedFolder(folderPath, configuredFolderPath)
                )
        )
        .sort((left, right) => {
            if (left === '') return -1;
            if (right === '') return 1;
            return left.localeCompare(right);
        });
}

export async function runFilesystemSync(
    userId: string,
    options: RunFilesystemSyncOptions = {}
): Promise<FilesystemSyncSummary> {
    const folders = await prisma.syncFolder.findMany({
        where: options.folderId
            ? {
                id: options.folderId,
                userId,
                enabled: true
            }
            : {
                userId,
                enabled: true
            },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const summary: FilesystemSyncSummary = {
        scannedFolders: 0,
        scannedFiles: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        missingMarked: 0,
        errors: []
    };

    if (options.folderId && folders.length === 0) {
        return {
            ...summary,
            errors: [
                {
                    storageKey: '',
                    folderPath: '',
                    error: 'Sync folder not found or not enabled'
                }
            ]
        };
    }

    const seenPhotoIds = new Set<string>();

    for (const folder of folders) {
        summary.scannedFolders += 1;

        try {
            const storageRoot = getPhotoStorageRoot(folder.storageKey);
            const normalizedFolderPath = normalizeFolderPath(folder.folderPath);
            const absoluteFolderPath = normalizedFolderPath
                ? path.join(storageRoot, normalizedFolderPath)
                : storageRoot;

            const stat = await fs.stat(absoluteFolderPath);
            if (!stat.isDirectory()) {
                throw new Error('Configured path is not a directory');
            }

            const absoluteFiles = await walkDirectoryRecursive(absoluteFolderPath);

            for (const absoluteFilePath of absoluteFiles) {
                summary.scannedFiles += 1;

                const relativePath = toRelativeStoragePath(storageRoot, absoluteFilePath);
                const filename = path.basename(absoluteFilePath);
                const fileHash = await sha256File(absoluteFilePath);
                const exif = await readExifCoordinates(absoluteFilePath);

                const existing = await prisma.photo.findFirst({
                    where: {
                        userId,
                        storageKey: folder.storageKey,
                        filePath: relativePath
                    }
                });

                if (!existing) {
                    const created = await prisma.photo.create({
                        data: {
                            userId,
                            source: 'filesystem_sync',
                            sourceItemId: null,
                            storageKey: folder.storageKey,
                            filePath: relativePath,
                            originalFilename: filename,
                            fileHash,
                            takenAt: exif.takenAt,
                            latitude: exif.latitude,
                            longitude: exif.longitude,
                            lastSeenAt: new Date(),
                            missingFromDisk: false
                        }
                    });

                    seenPhotoIds.add(created.id);
                    summary.created += 1;
                    continue;
                }

                const updated = await prisma.photo.update({
                    where: { id: existing.id },
                    data: {
                        originalFilename: filename,
                        fileHash,
                        takenAt: exif.takenAt ?? existing.takenAt,
                        latitude: exif.latitude ?? existing.latitude,
                        longitude: exif.longitude ?? existing.longitude,
                        lastSeenAt: new Date(),
                        missingFromDisk: false
                    }
                });

                seenPhotoIds.add(updated.id);
                summary.updated += 1;
            }

            await prisma.syncFolder.update({
                where: { id: folder.id },
                data: { lastScannedAt: new Date() }
            });
        } catch (error) {
            summary.errors.push({
                storageKey: folder.storageKey,
                folderPath: folder.folderPath,
                error: error instanceof Error ? error.message : 'Unknown sync error'
            });
        }
    }

    if (folders.length > 0) {
        const previouslySyncedPhotos = await prisma.photo.findMany({
            where: {
                userId,
                source: 'filesystem_sync',
                OR: folders.map((folder) => ({
                    storageKey: folder.storageKey
                }))
            },
            select: {
                id: true,
                storageKey: true,
                filePath: true
            }
        });

        for (const photo of previouslySyncedPhotos) {
            const belongsToScannedFolders = folders.some((folder) =>
                folder.storageKey === photo.storageKey &&
                matchesFolderPrefix(photo.filePath, folder.folderPath)
            );

            if (!belongsToScannedFolders || seenPhotoIds.has(photo.id)) {
                continue;
            }

            try {
                const absolutePath = resolvePhotoAbsolutePath(photo.storageKey, photo.filePath);
                await fs.access(absolutePath);

                await prisma.photo.update({
                    where: { id: photo.id },
                    data: {
                        missingFromDisk: false,
                        lastSeenAt: new Date()
                    }
                });
            } catch {
                await prisma.photo.update({
                    where: { id: photo.id },
                    data: {
                        missingFromDisk: true,
                        lastSeenAt: new Date()
                    }
                });

                summary.missingMarked += 1;
            }
        }
    }

    return summary;
}