import exifr from 'exifr';

export type ExtractedMetadata = {
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
};

export async function extractPhotoMetadata(filePath: string): Promise<ExtractedMetadata> {
  try {
    const data = await exifr.parse(filePath, { gps: true, tiff: true, exif: true });

    return {
      takenAt: data?.DateTimeOriginal ?? data?.CreateDate ?? null,
      latitude: typeof data?.latitude === 'number' ? data.latitude : null,
      longitude: typeof data?.longitude === 'number' ? data.longitude : null
    };
  } catch {
    return {
      takenAt: null,
      latitude: null,
      longitude: null
    };
  }
}
