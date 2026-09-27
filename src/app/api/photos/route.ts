import { NextRequest, NextResponse } from 'next/server';
import { photoFiltersSchema } from '@/lib/validators';
import { listPhotos } from '@/lib/photos';

export async function GET(request: NextRequest) {
  const parseResult = photoFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid filters', details: parseResult.error.flatten() }, { status: 400 });
  }

  const photos = await listPhotos(parseResult.data);
  return NextResponse.json({ photos });
}
