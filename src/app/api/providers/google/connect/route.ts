import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireCurrentUser } from '@/lib/auth';
import { buildGoogleOAuthUrl } from '@/lib/google-photos';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = `${user.id}:${randomUUID()}`;
  const url = buildGoogleOAuthUrl(state);
  return NextResponse.redirect(url);
}
