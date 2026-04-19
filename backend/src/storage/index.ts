import { resolve } from 'node:path';
import type { StorageProvider } from './interface.js';
import { LocalStorageProvider } from './local.js';
import { S3StorageProvider } from './s3.js';

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

  if (storageType === 's3') {
    _instance = new S3StorageProvider({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'openskillhub-packages',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    });
    return _instance;
  }

  throw new Error(`Unsupported storage type: ${storageType}`);
}
