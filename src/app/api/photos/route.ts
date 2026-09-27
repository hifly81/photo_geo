import { NextRequest, NextResponse } from 'next/server';
import { photoFiltersSchema } from '@/lib/validators';
import { listPhotos } from '@/lib/photos';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parseResult = photoFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid filters', details: parseResult.error.flatten() }, { status: 400 });
  }

  const photos = await listPhotos(user.id, parseResult.data);
  return NextResponse.json({ photos });
}
