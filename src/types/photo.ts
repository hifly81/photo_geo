export type PhotoTagItem = {
  tag: {
    id: string;
    name: string;
  };
};

export type PhotoRecord = {
  id: string;
  originalFilename: string;
  storagePath: string;
  source: string;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  caption: string | null;
  tags: PhotoTagItem[];
};
