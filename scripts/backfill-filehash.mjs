import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import { calculateFileHash } from '../src/lib/storage.js';

const prisma = new PrismaClient();

async function main() {
  const photos = await prisma.photo.findMany({
    where: {
      fileHash: null
    },
    select: {
      id: true,
      storagePath: true
    }
  });

  let updated = 0;
  let skipped = 0;

  for (const photo of photos) {
    const filename = photo.storagePath.split('/').pop();
    if (!filename) {
      skipped += 1;
      continue;
    }

    const fullPath = new URL(`../uploads/${filename}`, import.meta.url);

    try {
      const buffer = await fs.readFile(fullPath);
      const fileHash = calculateFileHash(buffer);

      await prisma.photo.update({
        where: { id: photo.id },
        data: { fileHash }
      });

      updated += 1;
    } catch {
      skipped += 1;
    }
  }

  console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}`);
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
