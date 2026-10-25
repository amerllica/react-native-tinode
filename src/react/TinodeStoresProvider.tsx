import { useEffect, useMemo, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { TinodeStoresContext, type TinodeStores } from './context';
import type { ClientPort } from './ports';
import { SessionStore } from './session-store';
import { TopicRegistry } from './topic-registry';

export interface TinodeLifecycleOptions {
  reconnectOnForeground?: boolean;
  pageSize?: number;
}

export type TinodeStoresProviderProps = TinodeLifecycleOptions & {
  client: ClientPort;
  children?: ReactNode;
};

export function TinodeStoresProvider({
  client,
  children,
  reconnectOnForeground = true,
  pageSize,
}: TinodeStoresProviderProps) {
  const stores = useMemo<TinodeStores>(() => {
    const session = new SessionStore(client);
    return { client, session, registry: new TopicRegistry(session, pageSize) };
  }, [client, pageSize]);

  useEffect(() => stores.registry.start(), [stores]);

  useEffect(() => {
    if (!reconnectOnForeground) {
      return undefined;
    }
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        stores.session.reconnect();
      }
    });
    return () => appState.remove();
  }, [stores, reconnectOnForeground]);

  return (
    <TinodeStoresContext.Provider value={stores}>
      {children}
    </TinodeStoresContext.Provider>
  );
}
