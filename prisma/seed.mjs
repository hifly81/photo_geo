import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panorama = await prisma.tag.upsert({
    where: { name: 'panorama' },
    update: {},
    create: { name: 'panorama' }
  });

  const city = await prisma.tag.upsert({
    where: { name: 'city' },
    update: {},
    create: { name: 'city' }
  });

  const firstPhoto = await prisma.photo.create({
    data: {
      originalFilename: 'demo-rome.jpg',
      storagePath: '/api/files/demo-rome.jpg',
      source: 'seed',
      takenAt: new Date('2024-06-15T10:00:00.000Z'),
      latitude: 41.9028,
      longitude: 12.4964,
      country: 'Italy',
      city: 'Rome',
      caption: 'Demo seeded photo in Rome',
      tags: {
        create: [
          { tagId: panorama.id },
          { tagId: city.id }
        ]
      }
    }
  });

  await prisma.photo.upsert({
    where: { id: firstPhoto.id },
    update: {},
    create: {
      originalFilename: 'demo-rome.jpg',
      storagePath: '/api/files/demo-rome.jpg',
      source: 'seed',
      takenAt: new Date('2024-06-15T10:00:00.000Z'),
      latitude: 41.9028,
      longitude: 12.4964,
      country: 'Italy',
      city: 'Rome',
      caption: 'Demo seeded photo in Rome'
    }
  });
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
