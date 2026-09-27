import { NextRequest, NextResponse } from 'next/server';
import { resolveStoredFilePath } from '@/lib/storage';
import { imageContentTypeFromPath } from '@/lib/photos';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const path = resolveStoredFilePath(filename);

  try {
    const file = await fs.readFile(path);
    return new NextResponse(file, {
      headers: {
        'Content-Type': imageContentTypeFromPath(path),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
