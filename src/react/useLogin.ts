import { useMemo, useSyncExternalStore } from 'react';
import type { AuthToken } from '../core/types';
import { useTinodeStores } from './context';

export interface LoginApi {
  loginBasic: (uname: string, password: string) => Promise<void>;
  loginToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  user?: string;
  token?: AuthToken;
  error?: unknown;
}

export function useLogin(): LoginApi {
  const { session } = useTinodeStores();
  const { user, token, error } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot
  );
  const actions = useMemo(
    () => ({
      loginBasic: (uname: string, password: string) =>
        session.loginBasic(uname, password),
      loginToken: (authToken: string) => session.loginToken(authToken),
      logout: () => session.logout(),
    }),
    [session]
  );
  return { ...actions, user, token, error };
}
