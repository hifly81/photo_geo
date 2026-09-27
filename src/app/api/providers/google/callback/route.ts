import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { exchangeGoogleCode, fetchGoogleUserProfile, saveGoogleProviderAccount } from '@/lib/google-photos';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?google=missing_code', request.url));
  }

  try {
    const tokenPayload = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserProfile(tokenPayload.access_token);
    await saveGoogleProviderAccount(user.id, tokenPayload, profile);
    return NextResponse.redirect(new URL('/?google=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?google=error', request.url));
  }
}
