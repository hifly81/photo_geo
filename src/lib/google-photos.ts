import { prisma } from '@/lib/prisma';

const GOOGLE_PROVIDER = 'google_photos';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requireEnv('GOOGLE_REDIRECT_URI')
  };
}

export function buildGoogleOAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/photoslibrary.readonly'
  ].join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Google OAuth code');
  }

  return response.json();
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  return response.json() as Promise<{ sub?: string; email?: string }>;
}

export async function saveGoogleProviderAccount(userId: string, tokenPayload: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}, profile: { sub?: string; email?: string }) {
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000)
    : null;

  return prisma.providerAccount.upsert({
    where: {
      userId_provider: {
        userId,
        provider: GOOGLE_PROVIDER
      }
    },
    update: {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? undefined,
      expiresAt,
      providerUserId: profile.sub,
      email: profile.email
    },
    create: {
      userId,
      provider: GOOGLE_PROVIDER,
      providerUserId: profile.sub,
      email: profile.email,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token,
      expiresAt
    }
  });
}

export async function getGoogleProviderAccount(userId: string) {
  return prisma.providerAccount.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: GOOGLE_PROVIDER
      }
    }
  });
}

export async function deleteGoogleProviderAccount(userId: string) {
  await prisma.providerAccount.deleteMany({
    where: {
      userId,
      provider: GOOGLE_PROVIDER
    }
  });
}

export async function listGoogleMediaItems(accessToken: string) {
  const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=25', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google Photos media items');
  }

  const payload = await response.json() as { mediaItems?: Array<any> };
  return payload.mediaItems ?? [];
}
