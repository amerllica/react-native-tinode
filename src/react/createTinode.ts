import { Platform } from 'react-native';
import { Tinode, type TinodeConfig } from '../sdk';

export type TinodePlatform = 'ios' | 'android' | 'web';

export interface CreateTinodeOptions extends Omit<
  TinodeConfig,
  'appName' | 'platform'
> {
  appName: string;
  language?: string;
  logging?: boolean;
  onStorageReady?: (error?: unknown) => void;
}

export function detectPlatform(os: string = Platform.OS): TinodePlatform {
  return os === 'ios' || os === 'android' ? os : 'web';
}

export function createTinode({
  language,
  logging = false,
  onStorageReady,
  ...config
}: CreateTinodeOptions): Tinode {
  const client = new Tinode(
    {
      ...config,
      secure: config.secure ?? true,
      persist: config.persist ?? false,
      platform: detectPlatform(),
    },
    onStorageReady
  );
  if (language) {
    client.setHumanLanguage(language);
  }
  client.enableLogging(logging, true);
  return client;
}
