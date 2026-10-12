import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getPhotoSuggestions } from '@/lib/photo-suggestions';

export const runtime = 'nodejs';

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;

        if (!id?.trim()) {
            return NextResponse.json({ error: 'Photo id is required' }, { status: 400 });
        }

        const suggestions = await getPhotoSuggestions(user.id, id);

        return NextResponse.json({
            photoId: id,
            suggestions
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to analyze photo';
        const status = message === 'Photo not found' ? 404 : 500;

        return NextResponse.json(
            {
                error: message
            },
            { status }
        );
    }
}