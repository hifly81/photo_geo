import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
    const user = await requireCurrentUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
        where: {
            photos: {
                some: {
                    photo: {
                        userId: user.id
                    }
                }
            }
        },
        orderBy: {
            name: 'asc'
        },
        select: {
            id: true,
            name: true
        }
    });

    return NextResponse.json({ tags });
}