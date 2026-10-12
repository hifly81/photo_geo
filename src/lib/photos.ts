import { prisma } from '@/lib/prisma';
import { buildPhotoUrl } from '@/lib/filesystem-storage';
import { Prisma } from '@prisma/client';

type PhotoFilters = {
  from?: string;
  to?: string;
  country?: string;
  city?: string;
  tag?: string;
  tags?: string[];
  dateYear?: string;
  dateMonth?: string;
  noDate?: boolean;
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

export type DateTreeMonth = {
  month: string;
  count: number;
};

export type DateTreeYear = {
  year: string;
  count: number;
  months: DateTreeMonth[];
};

export type DateTree = {
  years: DateTreeYear[];
  noDateCount: number;
};

function buildTagFilter(filters: PhotoFilters): Prisma.PhotoWhereInput['tags'] | undefined {
  const normalizedTags = (filters.tags ?? [])
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

  if (normalizedTags.length > 0) {
    return {
      some: {
        tag: {
          name: {
            in: normalizedTags
          }
        }
      }
    };
  }

  if (filters.tag) {
    return {
      some: {
        tag: {
          name: filters.tag
        }
      }
    };
  }

  return undefined;
}

function buildTakenAtFilter(filters: PhotoFilters): Prisma.PhotoWhereInput['takenAt'] {
  if (filters.noDate) {
    return null;
  }

  if (filters.dateYear) {
    const year = Number(filters.dateYear);
    const month = filters.dateMonth ? Number(filters.dateMonth) : null;

    if (month) {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

      return {
        gte: start,
        lt: end
      };
    }

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

    return {
      gte: start,
      lt: end
    };
  }

  if (filters.from || filters.to) {
    return {
      gte: filters.from ? new Date(filters.from) : undefined,
      lte: filters.to ? new Date(filters.to) : undefined
    };
  }

  return undefined;
}

function buildBasePhotoWhere(userId: string, filters: PhotoFilters): Prisma.PhotoWhereInput {
  return {
    userId,
    takenAt: buildTakenAtFilter(filters),
    country: filters.country || undefined,
    city: filters.city || undefined,
    tags: buildTagFilter(filters)
  };
}

function buildPhotoWhere(userId: string, filters: PhotoFilters, mode: PhotoListMode): Prisma.PhotoWhereInput {
  const where: Prisma.PhotoWhereInput = buildBasePhotoWhere(userId, filters);

  if (mode === 'with-geolocation') {
    where.latitude = { not: null };
    where.longitude = { not: null };
  }

  if (mode === 'missing-geolocation') {
    where.OR = [{ latitude: null }, { longitude: null }];
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

export async function getPhotoCountsForTabs(userId: string, filters: CountFilters) {
  const baseFilters: PhotoFilters = {
    from: filters.from,
    to: filters.to,
    country: filters.country,
    city: filters.city,
    tag: filters.tag,
    tags: filters.tags,
    dateYear: filters.dateYear,
    dateMonth: filters.dateMonth,
    noDate: filters.noDate
  };

  const byLocationFilters: PhotoFilters = {
    from: filters.from,
    to: filters.to,
    country: filters.locationCountry || '',
    city: filters.locationCity || '',
    tag: filters.tag,
    tags: filters.tags,
    dateYear: filters.dateYear,
    dateMonth: filters.dateMonth,
    noDate: filters.noDate
  };

  const [all, withGeolocation, missingGeolocation, missingLocationInfo, byLocation] = await Promise.all([
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
      takenAt: buildTakenAtFilter(filters),
      tags: buildTagFilter(filters),
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

  return rows.map((row) => row.country?.trim()).filter((value): value is string => Boolean(value));
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
      takenAt: buildTakenAtFilter(filters),
      country: filters.country,
      tags: buildTagFilter(filters),
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

  return rows.map((row) => row.city?.trim()).filter((value): value is string => Boolean(value));
}

export async function getAvailableDateTree(
    userId: string,
    filters: Omit<PhotoFilters, 'dateYear' | 'dateMonth' | 'noDate'>
): Promise<DateTree> {
  const rows = await prisma.photo.findMany({
    where: {
      userId,
      country: filters.country || undefined,
      city: filters.city || undefined,
      tags: buildTagFilter(filters)
    },
    select: {
      takenAt: true
    }
  });

  const yearMap = new Map<string, Map<string, number>>();
  let noDateCount = 0;

  for (const row of rows) {
    if (!row.takenAt) {
      noDateCount += 1;
      continue;
    }

    const date = new Date(row.takenAt);
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map<string, number>());
    }

    const monthMap = yearMap.get(year)!;
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const years = Array.from(yearMap.entries())
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, monthsMap]) => {
        const months = Array.from(monthsMap.entries())
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([month, count]) => ({
              month,
              count
            }));

        return {
          year,
          count: months.reduce((sum, item) => sum + item.count, 0),
          months
        };
      });

  return {
    years,
    noDateCount
  };
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