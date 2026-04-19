import { resolve } from 'node:path';
import type { StorageProvider } from './interface.js';
import { LocalStorageProvider } from './local.js';

export type { StorageProvider } from './interface.js';

let _instance: StorageProvider | null = null;

export function createStorage(): StorageProvider {
  if (_instance) return _instance;

  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'local') {
    const basePath = resolve(process.env.STORAGE_LOCAL_PATH || './storage');
    _instance = new LocalStorageProvider(basePath);
    return _instance;
  }

  // S3 will be added in Phase 7
  throw new Error(`Unsupported storage type: ${storageType}`);
}
