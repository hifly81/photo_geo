import { prisma } from '@/lib/prisma';
import { extractPhotoMetadata } from '@/lib/exif';
import {
    calculateFileHash,
    directoryExistsInStorage,
    getPhotoStorageRoot,
    normalizeRelativePhotoPath,
    readPhotoFile,
    scanPhotoDirectories
} from '@/lib/filesystem-storage';

export type SyncSummary = {
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

export function normalizeSyncFolderInput(storageKey: string, folderPath: string) {
    const normalizedStorageKey = storageKey.trim();
    if (!normalizedStorageKey) {
        throw new Error('Storage key is required');
    }

    getPhotoStorageRoot(normalizedStorageKey);

    return {
        storageKey: normalizedStorageKey,
        folderPath: normalizeRelativePhotoPath(folderPath)
    };
}

export async function validateSyncFolder(storageKey: string, folderPath: string) {
    const normalized = normalizeSyncFolderInput(storageKey, folderPath);
    const exists = await directoryExistsInStorage(normalized.storageKey, normalized.folderPath);

    if (!exists) {
        throw new Error('Configured folder does not exist or is not a directory');
    }

    return normalized;
}

export async function syncFilesystemPhotosForUser(userId: string): Promise<SyncSummary> {
    const folders = await prisma.syncFolder.findMany({
        where: {
            userId,
            enabled: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const summary: SyncSummary = {
        scannedFolders: folders.length,
        scannedFiles: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        missingMarked: 0,
        errors: []
    };

    if (!folders.length) {
        return summary;
    }

    const seenKeys = new Set<string>();

    for (const folder of folders) {
        try {
            const files = await scanPhotoDirectories(folder.storageKey, [folder.folderPath]);
            summary.scannedFiles += files.length;

            for (const file of files) {
                const compositeKey = `${file.storageKey}::${file.filePath}`;
                seenKeys.add(compositeKey);

                try {
                    const buffer = await readPhotoFile(file.storageKey, file.filePath);
                    const fileHash = calculateFileHash(buffer);
                    const metadata = await extractPhotoMetadata(file.absolutePath);

                    const existing = await prisma.photo.findFirst({
                        where: {
                            userId,
                            storageKey: file.storageKey,
                            filePath: file.filePath
                        }
                    });

                    if (existing) {
                        await prisma.photo.update({
                            where: { id: existing.id },
                            data: {
                                originalFilename: file.originalFilename,
                                fileHash,
                                takenAt: metadata.takenAt,
                                latitude: metadata.latitude,
                                longitude: metadata.longitude,
                                lastSeenAt: new Date(),
                                missingFromDisk: false
                            }
                        });

                        summary.updated += 1;
                    } else {
                        await prisma.photo.create({
                            data: {
                                userId,
                                originalFilename: file.originalFilename,
                                storageKey: file.storageKey,
                                filePath: file.filePath,
                                source: 'filesystem_sync',
                                fileHash,
                                takenAt: metadata.takenAt,
                                latitude: metadata.latitude,
                                longitude: metadata.longitude,
                                lastSeenAt: new Date(),
                                missingFromDisk: false
                            }
                        });

                        summary.created += 1;
                    }
                } catch {
                    summary.skipped += 1;
                }
            }

            await prisma.syncFolder.update({
                where: { id: folder.id },
                data: {
                    lastScannedAt: new Date()
                }
            });
        } catch (error) {
            summary.errors.push({
                storageKey: folder.storageKey,
                folderPath: folder.folderPath,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    const syncedPhotos = await prisma.photo.findMany({
        where: {
            userId,
            source: 'filesystem_sync'
        },
        select: {
            id: true,
            storageKey: true,
            filePath: true
        }
    });

    const missingIds = syncedPhotos
        .filter((photo) => !seenKeys.has(`${photo.storageKey}::${photo.filePath}`))
        .map((photo) => photo.id);

    if (missingIds.length > 0) {
        const result = await prisma.photo.updateMany({
            where: {
                id: {
                    in: missingIds
                }
            },
            data: {
                missingFromDisk: true
            }
        });

        summary.missingMarked = result.count;
    }

    return summary;
}