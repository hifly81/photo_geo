import { prisma } from '@/lib/prisma';

const AMAZON_PROVIDER = 'amazon_photos';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getAmazonOAuthConfig() {
  return {
    clientId: requireEnv('AMAZON_CLIENT_ID'),
    clientSecret: requireEnv('AMAZON_CLIENT_SECRET'),
    redirectUri: requireEnv('AMAZON_REDIRECT_URI'),
    apiBaseUrl: requireEnv('AMAZON_PHOTOS_API_BASE_URL')
  };
}

export function buildAmazonOAuthUrl(state: string) {
  const { clientId, redirectUri } = getAmazonOAuthConfig();
  const url = new URL('https://www.amazon.com/ap/oa');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'profile');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeAmazonCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getAmazonOAuthConfig();

  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Amazon OAuth code');
  }

  return response.json();
}

export async function fetchAmazonUserProfile(accessToken: string) {
  const response = await fetch('https://api.amazon.com/user/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Amazon user profile');
  }

  return response.json() as Promise<{ user_id?: string; email?: string }>;
}

export async function saveAmazonProviderAccount(userId: string, tokenPayload: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}, profile: { user_id?: string; email?: string }) {
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000)
    : null;

  return prisma.providerAccount.upsert({
    where: {
      userId_provider: {
        userId,
        provider: AMAZON_PROVIDER
      }
    },
    update: {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? undefined,
      expiresAt,
      providerUserId: profile.user_id,
      email: profile.email
    },
    create: {
      userId,
      provider: AMAZON_PROVIDER,
      providerUserId: profile.user_id,
      email: profile.email,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token,
      expiresAt
    }
  });
}

export async function getAmazonProviderAccount(userId: string) {
  return prisma.providerAccount.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: AMAZON_PROVIDER
      }
    }
  });
}

export async function deleteAmazonProviderAccount(userId: string) {
  await prisma.providerAccount.deleteMany({
    where: {
      userId,
      provider: AMAZON_PROVIDER
    }
  });
}

export async function listAmazonMediaItems(accessToken: string) {
  const { apiBaseUrl } = getAmazonOAuthConfig();
  const response = await fetch(`${apiBaseUrl}/photos?limit=25`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Amazon Photos media items');
  }

  const payload = await response.json() as { data?: Array<any> };
  return payload.data ?? [];
}
