import { Platform } from 'react-native';
import type { StorageAdapter } from '../core/storage/storage-adapter';
import { Tinode } from '../core/tinode';

export type TinodePlatform = 'ios' | 'android' | 'web';

export interface CreateTinodeOptions {
  appName: string;
  host: string;
  apiKey: string;
  secure?: boolean;
  transport?: 'ws' | 'lp';
  persist?: boolean;
  storage?: StorageAdapter;
  language?: string;
  logging?: boolean;
  onStorageReady?: (error?: unknown) => void;
}

export function detectPlatform(os: string = Platform.OS): TinodePlatform {
  return os === 'ios' || os === 'android' ? os : 'web';
}

export function createTinode(options: CreateTinodeOptions): Tinode {
  const client = new Tinode(
    {
      appName: options.appName,
      host: options.host,
      apiKey: options.apiKey,
      secure: options.secure ?? true,
      transport: options.transport,
      platform: detectPlatform(),
      persist: options.persist ?? false,
      storage: options.storage,
    },
    options.onStorageReady
  );
  if (options.language) {
    client.setHumanLanguage(options.language);
  }
  client.enableLogging(options.logging ?? false, true);
  return client;
}
