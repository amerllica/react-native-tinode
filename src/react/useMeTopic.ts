import { useMemo, useSyncExternalStore } from 'react';
import { TOPIC_ME } from '../core/config';
import { ContactsStore, type Contact } from './contacts-store';
import { useTinodeStores } from './context';
import { useTopic } from './useTopic';

export interface MeTopicApi {
  contacts: readonly Contact[];
  isSubscribed: boolean;
  error?: unknown;
}

export function useMeTopic(): MeTopicApi {
  const { client } = useTinodeStores();
  const { isSubscribed, error } = useTopic(TOPIC_ME);
  const store = useMemo(() => new ContactsStore(client.getMeTopic()), [client]);
  const contacts = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { contacts, isSubscribed, error };
}
