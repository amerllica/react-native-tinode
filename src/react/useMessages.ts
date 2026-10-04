import { useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_MESSAGES_PAGE } from '../core/config';
import type { Message } from '../core/types';
import { MessagesStore } from './messages-store';
import type { MessageContent } from './ports';
import { useTopic } from './useTopic';

export interface UseMessagesOptions {
  pageSize?: number;
}

export interface MessagesApi {
  messages: readonly Message[];
  hasMore: boolean;
  loading: boolean;
  error?: unknown;
  loadMore: () => Promise<void>;
  send: (content: MessageContent) => Promise<void>;
  status: (msg: Message) => number;
  markRead: (seq?: number) => void;
}

export function useMessages(
  name: string,
  { pageSize = DEFAULT_MESSAGES_PAGE }: UseMessagesOptions = {}
): MessagesApi {
  const { topic } = useTopic(name);
  const store = useMemo(
    () => new MessagesStore(topic, pageSize),
    [topic, pageSize]
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const actions = useMemo(
    () => ({
      loadMore: () => store.loadMore(),
      send: (content: MessageContent) => store.send(content),
      status: (msg: Message) => store.status(msg),
      markRead: (seq?: number) => store.markRead(seq),
    }),
    [store]
  );
  return { ...state, ...actions };
}
