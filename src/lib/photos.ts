import { prisma } from '@/lib/prisma';
import { buildPhotoUrl } from '@/lib/filesystem-storage';

export async function listPhotos(userId: string, filters: {
  from?: string;
  to?: string;
  country?: string;
  city?: string;
  tag?: string;
}) {
  return prisma.photo.findMany({
    where: {
      userId,
      takenAt: filters.from || filters.to ? {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined
      } : undefined,
      country: filters.country || undefined,
      city: filters.city || undefined,
      tags: filters.tag ? {
        some: {
          tag: {
            name: filters.tag
          }
        }
      } : undefined
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function getPhotoForUser(id: string, userId: string) {
  return prisma.photo.findFirst({
    where: { id, userId },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  });
}

export function mapPhotoForClient<T extends { storageKey: string; filePath: string }>(photo: T) {
  return {
    ...photo,
    imageUrl: buildPhotoUrl(photo.storageKey, photo.filePath)
  };
}

export function mapPhotosForClient<T extends { storageKey: string; filePath: string }>(photos: T[]) {
  return photos.map(mapPhotoForClient);
}

export function imageContentTypeFromPath(filePath: string) {
  const normalized = filePath.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.gif')) return 'image/gif';
  if (normalized.endsWith('.jpeg') || normalized.endsWith('.jpg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function removeOrphanTags() {
  const tags = await prisma.tag.findMany({
    include: {
      photos: true
    }
  });

  const orphanIds = tags.filter((tag) => tag.photos.length === 0).map((tag) => tag.id);

  if (orphanIds.length > 0) {
    await prisma.tag.deleteMany({
      where: {
        id: {
          in: orphanIds
        }
      }
    });
  }
}
