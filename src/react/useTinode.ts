import { useContext } from 'react';
import type { Tinode } from '../core/tinode';
import { TinodeClientContext } from './context';

export function useTinode(): Tinode {
  const client = useContext(TinodeClientContext);
  if (!client) {
    throw new Error('useTinode must be used inside <TinodeProvider>.');
  }
  return client;
}
