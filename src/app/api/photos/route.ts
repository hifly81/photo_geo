import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableCities,
  getAvailableCountries,
  getPhotoCountsForTabs,
  listPhotosPaginated,
  mapPhotosForClient
} from '@/lib/photos';
import { photoFiltersSchema } from '@/lib/validators';
import { getCurrentUser } from '@/lib/auth';

const allowedModes = new Set([
  'all',
  'with-geolocation',
  'missing-geolocation',
  'missing-location-info'
]);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parseResult = photoFiltersSchema.safeParse(rawParams);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid filters', details: parseResult.error.flatten() }, { status: 400 });
  }

  const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
  const pageSizeParam = Number(request.nextUrl.searchParams.get('pageSize') ?? '100');
  const modeParam = request.nextUrl.searchParams.get('mode') ?? 'all';
  const locationCountry = request.nextUrl.searchParams.get('locationCountry') ?? '';
  const locationCity = request.nextUrl.searchParams.get('locationCity') ?? '';
  const tagsParam = request.nextUrl.searchParams.get('tags') ?? '';
  const dateYear = request.nextUrl.searchParams.get('dateYear') ?? '';
  const dateMonth = request.nextUrl.searchParams.get('dateMonth') ?? '';
  const noDate = request.nextUrl.searchParams.get('noDate') ?? '';

  const selectedTags = tagsParam
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(100, Math.floor(pageSizeParam))
      : 100;

  const mode = allowedModes.has(modeParam)
      ? (modeParam as 'all' | 'with-geolocation' | 'missing-geolocation' | 'missing-location-info')
      : 'all';

  const effectiveFilters =
      locationCountry || locationCity
          ? {
            ...parseResult.data,
            tags: selectedTags,
            dateYear: dateYear || undefined,
            dateMonth: dateMonth || undefined,
            noDate: noDate === 'true',
            country: locationCountry || undefined,
            city: locationCity || undefined
          }
          : {
            ...parseResult.data,
            tags: selectedTags,
            dateYear: dateYear || undefined,
            dateMonth: dateMonth || undefined,
            noDate: noDate === 'true'
          };

  const [result, counts, availableCountries, availableCities] = await Promise.all([
    listPhotosPaginated(user.id, effectiveFilters, { page, pageSize }, mode),
    getPhotoCountsForTabs(user.id, {
      ...parseResult.data,
      tags: selectedTags,
      dateYear: dateYear || undefined,
      dateMonth: dateMonth || undefined,
      noDate: noDate === 'true',
      locationCountry,
      locationCity
    }),
    getAvailableCountries(user.id, {
      from: parseResult.data.from,
      to: parseResult.data.to,
      tag: parseResult.data.tag,
      tags: selectedTags,
      dateYear: dateYear || undefined,
      dateMonth: dateMonth || undefined,
      noDate: noDate === 'true'
    }),
    getAvailableCities(user.id, {
      from: parseResult.data.from,
      to: parseResult.data.to,
      tag: parseResult.data.tag,
      tags: selectedTags,
      dateYear: dateYear || undefined,
      dateMonth: dateMonth || undefined,
      noDate: noDate === 'true',
      country: locationCountry || undefined
    })
  ]);

  return NextResponse.json({
    photos: mapPhotosForClient(result.photos),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    mode,
    counts,
    availableCountries,
    availableCities
  });
}