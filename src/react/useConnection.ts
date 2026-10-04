import { useSyncExternalStore } from 'react';
import { useTinodeStores } from './context';
import type { ConnectionStatus } from './session-store';

export interface ConnectionInfo {
  status: ConnectionStatus;
  retryIn?: number;
  error?: unknown;
}

export function useConnection(): ConnectionInfo {
  const { session } = useTinodeStores();
  const { status, retryIn, error } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot
  );
  return { status, retryIn, error };
}
