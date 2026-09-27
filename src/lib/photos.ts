import { prisma } from '@/lib/prisma';

export async function listPhotos(filters: {
  from?: string;
  to?: string;
  country?: string;
  city?: string;
  tag?: string;
}) {
  return prisma.photo.findMany({
    where: {
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

export async function getPhoto(id: string) {
  return prisma.photo.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  });
}

export function imageContentTypeFromPath(storagePath: string) {
  const normalized = storagePath.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.gif')) return 'image/gif';
  if (normalized.endsWith('.jpeg') || normalized.endsWith('.jpg')) return 'image/jpeg';
  return 'application/octet-stream';
}
