import { NextRequest, NextResponse } from 'next/server';
import { imageContentTypeFromPath } from '@/lib/photos';
import { readPhotoFile } from '@/lib/filesystem-storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageKey = request.nextUrl.searchParams.get('storage')?.trim();
  const filePath = request.nextUrl.searchParams.get('path')?.trim();

  if (!storageKey || !filePath) {
    return NextResponse.json(
      { error: 'Both storage and path query parameters are required' },
      { status: 400 }
    );
  }

  try {
    const file = await readPhotoFile(storageKey, filePath);

    return new NextResponse(file, {
      headers: {
        'Content-Type': imageContentTypeFromPath(filePath),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File not found';
    const status = /required|invalid|unknown|traversal|escapes/i.test(message) ? 400 : 404;

    return NextResponse.json({ error: message }, { status });
  }
}
