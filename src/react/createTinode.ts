import { Platform } from 'react-native';
import {
  Tinode,
  type NetInfoLike,
  type StorageAdapter,
  type TinodeNetwork,
} from '../sdk';

export type TinodePlatform = 'ios' | 'android' | 'web';

export interface CreateTinodeOptions {
  appName: string;
  host: string;
  apiKey: string;
  secure?: boolean;
  transport?: 'ws' | 'lp';
  persist?: boolean;
  storage?: StorageAdapter | null;
  netInfo?: NetInfoLike | null;
  network?: TinodeNetwork;
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
      netInfo: options.netInfo,
      network: options.network,
    },
    options.onStorageReady
  );
  if (options.language) {
    client.setHumanLanguage(options.language);
  }
  client.enableLogging(options.logging ?? false, true);
  return client;
}
