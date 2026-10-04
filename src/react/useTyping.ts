import { useMemo, useSyncExternalStore } from 'react';
import { useTinodeStores } from './context';
import { TypingStore } from './typing-store';
import { useTopic } from './useTopic';

export interface TypingApi {
  typingUsers: readonly string[];
  notifyTyping: () => void;
}

export function useTyping(name: string): TypingApi {
  const { client } = useTinodeStores();
  const { topic } = useTopic(name);
  const store = useMemo(
    () => new TypingStore(topic, (uid) => client.isMe(uid)),
    [topic, client]
  );
  const { typingUsers } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot
  );
  const notifyTyping = useMemo(() => () => store.notifyTyping(), [store]);
  return { typingUsers, notifyTyping };
}
