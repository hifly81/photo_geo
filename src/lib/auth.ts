import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const sessionCookieName = 'photo_geo_session';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(sessionCookieName)?.value;

  if (!sessionUserId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: sessionUserId }
  });
}

export async function requireCurrentUser() {
  return getCurrentUser();
}
