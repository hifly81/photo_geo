export type PhotoTagItem = {
  tag: {
    id: string;
    name: string;
  };
};

export type PhotoRecord = {
  id: string;
  originalFilename: string;
  storageKey: string;
  filePath: string;
  imageUrl: string;
  source: string;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  placeName: string | null;
  caption: string | null;
  lastSeenAt?: string | null;
  missingFromDisk?: boolean;
  tags: PhotoTagItem[];
};