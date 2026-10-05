import { prisma } from '@/lib/prisma';

export async function markPhotoAsDeleted(params: {
    userId: string;
    storageKey: string;
    filePath: string;
    fileHash?: string | null;
}) {
    const { userId, storageKey, filePath, fileHash } = params;

    return prisma.deletedPhoto.upsert({
        where: {
            userId_storageKey_filePath: {
                userId,
                storageKey,
                filePath
            }
        },
        update: {
            fileHash: fileHash ?? undefined,
            deletedAt: new Date()
        },
        create: {
            userId,
            storageKey,
            filePath,
            fileHash: fileHash ?? null,
            deletedAt: new Date()
        }
    });
}

export async function isDeletedPhoto(params: {
    userId: string;
    storageKey: string;
    filePath: string;
}) {
    const { userId, storageKey, filePath } = params;

    const deleted = await prisma.deletedPhoto.findUnique({
        where: {
            userId_storageKey_filePath: {
                userId,
                storageKey,
                filePath
            }
        }
    });

    return Boolean(deleted);
}