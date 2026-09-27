import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getGoogleProviderAccount, listGoogleMediaItems } from '@/lib/google-photos';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await getGoogleProviderAccount(user.id);

  if (!account) {
    return NextResponse.json({ connected: false, items: [] });
  }

  try {
    const items = await listGoogleMediaItems(account.accessToken);
    return NextResponse.json({ connected: true, items });
  } catch {
    return NextResponse.json({ connected: true, items: [], error: 'Failed to load Google Photos media' }, { status: 502 });
  }
}
