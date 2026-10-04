import { useState, type ReactNode } from 'react';
import type { Tinode } from '../core/tinode';
import { TinodeClientContext } from './context';
import { createTinode, type CreateTinodeOptions } from './createTinode';
import {
  TinodeStoresProvider,
  type TinodeLifecycleOptions,
} from './TinodeStoresProvider';

export type TinodeProviderProps = TinodeLifecycleOptions & {
  children?: ReactNode;
} & (
    | { client: Tinode; config?: never }
    | { config: CreateTinodeOptions; client?: never }
  );

export function TinodeProvider({
  client: providedClient,
  config,
  children,
  ...lifecycle
}: TinodeProviderProps) {
  const [ownClient] = useState(() =>
    providedClient ? null : config ? createTinode(config) : null
  );
  const client = providedClient ?? ownClient;
  if (!client) {
    throw new Error('<TinodeProvider> needs either `client` or `config`.');
  }

  return (
    <TinodeClientContext.Provider value={client}>
      <TinodeStoresProvider client={client} {...lifecycle}>
        {children}
      </TinodeStoresProvider>
    </TinodeClientContext.Provider>
  );
}
