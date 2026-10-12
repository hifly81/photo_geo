import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDateTree } from '@/lib/photos';
import { photoFiltersSchema } from '@/lib/validators';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = photoFiltersSchema.safeParse(rawParams);

    if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid filters', details: parseResult.error.flatten() }, { status: 400 });
    }

    const tagsParam = request.nextUrl.searchParams.get('tags') ?? '';
    const selectedTags = tagsParam
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

    const tree = await getAvailableDateTree(user.id, {
        from: parseResult.data.from,
        to: parseResult.data.to,
        country: parseResult.data.country,
        city: parseResult.data.city,
        tag: parseResult.data.tag,
        tags: selectedTags
    });

    return NextResponse.json(tree);
}