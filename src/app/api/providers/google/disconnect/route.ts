import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { deleteGoogleProviderAccount } from '@/lib/google-photos';

export const runtime = 'nodejs';

export async function POST() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteGoogleProviderAccount(user.id);
  return NextResponse.json({ ok: true });
}
