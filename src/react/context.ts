import { createContext, useContext } from 'react';
import type { Tinode } from '../core/tinode';
import type { ClientPort } from './ports';
import type { SessionStore } from './session-store';
import type { TopicRegistry } from './topic-registry';

export interface TinodeStores {
  readonly client: ClientPort;
  readonly session: SessionStore;
  readonly registry: TopicRegistry;
}

export const TinodeClientContext = createContext<Tinode | null>(null);
export const TinodeStoresContext = createContext<TinodeStores | null>(null);

export function useTinodeStores(): TinodeStores {
  const stores = useContext(TinodeStoresContext);
  if (!stores) {
    throw new Error('Tinode hooks must be used inside <TinodeProvider>.');
  }
  return stores;
}
