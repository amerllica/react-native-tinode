import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTinodeStores } from './context';
import type { SubscriberPort, TopicPort } from './ports';

export interface UseTopicOptions {
  autoSubscribe?: boolean;
}

export interface TopicDescription {
  public?: unknown;
  private?: unknown;
  online?: boolean;
}

export interface TopicApi {
  topic: TopicPort;
  isSubscribed: boolean;
  error?: unknown;
  desc: TopicDescription;
  subscribers: readonly SubscriberPort[];
  subscribe: () => Promise<void>;
  leave: (unsub?: boolean) => Promise<void>;
}

function collectSubscribers(topic: TopicPort): SubscriberPort[] {
  const subscribers: SubscriberPort[] = [];
  topic.subscribers((sub) => {
    subscribers.push(sub);
  });
  return subscribers;
}

export function useTopic(
  name: string,
  { autoSubscribe = true }: UseTopicOptions = {}
): TopicApi {
  const { registry } = useTinodeStores();
  const handle = useMemo(() => registry.handle(name), [registry, name]);

  useEffect(
    () => (autoSubscribe ? handle.acquire() : undefined),
    [handle, autoSubscribe]
  );

  const { isSubscribed, error, version } = useSyncExternalStore(
    handle.subscribe,
    handle.getSnapshot
  );

  const { topic } = handle;
  const details = useMemo(
    () => ({
      version,
      desc: {
        public: topic.public,
        private: topic.private,
        online: topic.online,
      },
      subscribers: collectSubscribers(topic),
    }),
    [topic, version]
  );

  const actions = useMemo(
    () => ({
      subscribe: () => handle.subscribeTopic(),
      leave: (unsub?: boolean) => handle.leaveTopic(unsub),
    }),
    [handle]
  );

  return {
    topic,
    isSubscribed,
    error,
    desc: details.desc,
    subscribers: details.subscribers,
    ...actions,
  };
}
