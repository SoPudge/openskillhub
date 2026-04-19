import { resolve } from 'node:path';
import type { StorageProvider } from './interface.js';
import { LocalStorageProvider } from './local.js';

export type { StorageProvider } from './interface.js';

export function createStorage(): StorageProvider {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'local') {
    const basePath = resolve(process.env.STORAGE_LOCAL_PATH || './storage');
    return new LocalStorageProvider(basePath);
  }

  // S3 will be added in Phase 7
  throw new Error(`Unsupported storage type: ${storageType}`);
}
