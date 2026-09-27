export type ImportProvider = {
  name: string;
  importPhotos: () => Promise<void>;
};

export const googlePhotosProvider: ImportProvider = {
  name: 'google_photos',
  async importPhotos() {
    throw new Error('Google Photos import not implemented yet.');
  }
};

export const amazonPhotosProvider: ImportProvider = {
  name: 'amazon_photos',
  async importPhotos() {
    throw new Error('Amazon Photos import not implemented yet.');
  }
};
