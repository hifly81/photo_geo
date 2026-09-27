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
