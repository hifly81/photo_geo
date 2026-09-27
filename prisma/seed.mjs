import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureUser(username) {
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: { username }
  });
}

async function ensureTag(name) {
  return prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name }
  });
}

async function ensureDemoPhoto(userId) {
  const existing = await prisma.photo.findFirst({
    where: {
      userId,
      originalFilename: 'demo-rome.jpg',
      source: 'seed'
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.photo.create({
    data: {
      userId,
      originalFilename: 'demo-rome.jpg',
      storagePath: '/api/files/demo-rome.jpg',
      source: 'seed',
      sourceItemId: 'seed-demo-rome',
      fileHash: 'seed-demo-rome-hash',
      takenAt: new Date('2024-06-15T10:00:00.000Z'),
      latitude: 41.9028,
      longitude: 12.4964,
      country: 'Italy',
      city: 'Rome',
      caption: 'Demo seeded photo in Rome'
    }
  });
}

async function ensurePhotoTag(photoId, tagId) {
  await prisma.photoTag.upsert({
    where: {
      photoId_tagId: {
        photoId,
        tagId
      }
    },
    update: {},
    create: {
      photoId,
      tagId
    }
  });
}

async function main() {
  const demoUser = await ensureUser('demo');
  const panorama = await ensureTag('panorama');
  const city = await ensureTag('city');
  const photo = await ensureDemoPhoto(demoUser.id);

  await ensurePhotoTag(photo.id, panorama.id);
  await ensurePhotoTag(photo.id, city.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
