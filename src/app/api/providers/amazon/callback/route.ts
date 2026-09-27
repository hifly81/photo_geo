import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { exchangeAmazonCode, fetchAmazonUserProfile, saveAmazonProviderAccount } from '@/lib/amazon-photos';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?amazon=missing_code', request.url));
  }

  try {
    const tokenPayload = await exchangeAmazonCode(code);
    const profile = await fetchAmazonUserProfile(tokenPayload.access_token);
    await saveAmazonProviderAccount(user.id, tokenPayload, profile);
    return NextResponse.redirect(new URL('/?amazon=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?amazon=error', request.url));
  }
}
