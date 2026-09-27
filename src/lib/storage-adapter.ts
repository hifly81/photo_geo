export type StoredFile = {
  filename: string;
  relativePath: string;
  absolutePath: string;
};

export interface StorageAdapter {
  save(tempPath: string, originalFilename: string): Promise<StoredFile>;
  deleteByRelativePath(relativePath: string): Promise<void>;
}

import { deleteStoredFileByRelativePath, saveUploadedFile } from '@/lib/storage';

export const localStorageAdapter: StorageAdapter = {
  save: saveUploadedFile,
  deleteByRelativePath: deleteStoredFileByRelativePath
};
