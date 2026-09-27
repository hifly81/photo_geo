import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { deleteAmazonProviderAccount } from '@/lib/amazon-photos';

export const runtime = 'nodejs';

export async function POST() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteAmazonProviderAccount(user.id);
  return NextResponse.json({ ok: true });
}
