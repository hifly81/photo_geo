import { prisma } from '@/lib/prisma';
import { buildPhotoUrl } from '@/lib/filesystem-storage';
import { Prisma } from '@prisma/client';

type PhotoFilters = {
  from?: string;
  to?: string;
  country?: string;
  city?: string;
  tag?: string;
};

type PhotoListMode =
    | 'all'
    | 'with-geolocation'
    | 'missing-geolocation'
    | 'missing-location-info';

type CountFilters = PhotoFilters & {
  locationCountry?: string;
  locationCity?: string;
};

function buildBasePhotoWhere(userId: string, filters: PhotoFilters): Prisma.PhotoWhereInput {
  return {
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
  };
}

function buildPhotoWhere(userId: string, filters: PhotoFilters, mode: PhotoListMode): Prisma.PhotoWhereInput {
  const where: Prisma.PhotoWhereInput = buildBasePhotoWhere(userId, filters);

  if (mode === 'with-geolocation') {
    where.latitude = { not: null };
    where.longitude = { not: null };
  }

  if (mode === 'missing-geolocation') {
    where.OR = [
      { latitude: null },
      { longitude: null }
    ];
  }

  if (mode === 'missing-location-info') {
    where.latitude = { not: null };
    where.longitude = { not: null };
    where.country = null;
    where.city = null;
    where.placeName = null;
  }

  return where;
}

export async function listPhotosPaginated(
    userId: string,
    filters: PhotoFilters,
    pagination: {
      page: number;
      pageSize: number;
    },
    mode: PhotoListMode = 'all'
) {
  const where = buildPhotoWhere(userId, filters, mode);
  const page = Math.max(1, pagination.page);
  const pageSize = Math.max(1, Math.min(100, pagination.pageSize));
  const skip = (page - 1) * pageSize;

  const [total, photos] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    })
  ]);

  return {
    photos,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getPhotoCountsForTabs(
    userId: string,
    filters: CountFilters
) {
  const baseFilters: PhotoFilters = {
    from: filters.from,
    to: filters.to,
    country: filters.country,
    city: filters.city,
    tag: filters.tag
  };

  const byLocationFilters: PhotoFilters = {
    from: filters.from,
    to: filters.to,
    country: filters.locationCountry || '',
    city: filters.locationCity || '',
    tag: filters.tag
  };

  const [
    all,
    withGeolocation,
    missingGeolocation,
    missingLocationInfo,
    byLocation
  ] = await Promise.all([
    prisma.photo.count({
      where: buildPhotoWhere(userId, baseFilters, 'all')
    }),
    prisma.photo.count({
      where: buildPhotoWhere(userId, baseFilters, 'with-geolocation')
    }),
    prisma.photo.count({
      where: buildPhotoWhere(userId, baseFilters, 'missing-geolocation')
    }),
    prisma.photo.count({
      where: buildPhotoWhere(userId, baseFilters, 'missing-location-info')
    }),
    prisma.photo.count({
      where: buildPhotoWhere(userId, byLocationFilters, 'all')
    })
  ]);

  return {
    all,
    withGeolocation,
    missingGeolocation,
    missingLocationInfo,
    byLocation
  };
}

export async function getAvailableCountries(userId: string, filters: Omit<PhotoFilters, 'country' | 'city'>) {
  const rows = await prisma.photo.findMany({
    where: {
      userId,
      takenAt: filters.from || filters.to ? {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined
      } : undefined,
      tags: filters.tag ? {
        some: {
          tag: {
            name: filters.tag
          }
        }
      } : undefined,
      country: {
        not: null
      }
    },
    select: {
      country: true
    },
    distinct: ['country'],
    orderBy: {
      country: 'asc'
    }
  });

  return rows
      .map((row) => row.country?.trim())
      .filter((value): value is string => Boolean(value));
}

export async function getAvailableCities(
    userId: string,
    filters: Omit<PhotoFilters, 'city'> & { country?: string }
) {
  if (!filters.country) {
    return [];
  }

  const rows = await prisma.photo.findMany({
    where: {
      userId,
      takenAt: filters.from || filters.to ? {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined
      } : undefined,
      country: filters.country,
      tags: filters.tag ? {
        some: {
          tag: {
            name: filters.tag
          }
        }
      } : undefined,
      city: {
        not: null
      }
    },
    select: {
      city: true
    },
    distinct: ['city'],
    orderBy: {
      city: 'asc'
    }
  });

  return rows
      .map((row) => row.city?.trim())
      .filter((value): value is string => Boolean(value));
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