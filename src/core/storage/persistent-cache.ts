import {
  MAX_SEQ,
  type DelLogRange,
  type MessageRecord,
  type SeqRange,
  type SeqWindow,
  type StorageAdapter,
  type SubscriptionRecord,
  type TopicRecord,
  type UserRecord,
} from './storage-adapter';

export type PersistentCacheLogger = (...args: unknown[]) => void;
export type PersistentCacheErrorHandler = (error: unknown) => void;

export interface CacheableTopic {
  name: string;
  seq: number;
  read: number;
  unread: number;
  acs?: unknown;
  _tags?: unknown;
  getAccessMode(): { jsonHelper(): unknown };
  setAccessMode(acs: unknown): unknown;
}

export interface MessageQuery {
  since?: number;
  before?: number;
  limit?: number;
  ranges?: SeqRange[];
}

export interface CacheableMessage {
  topic: string;
  seq: number;
}

export type CachedSubscription = SubscriptionRecord & { user: string };

export interface CachedUser {
  user: string;
  public: unknown;
}

type EachCallback<T> = (this: unknown, item: T) => void;

const TOPIC_FIELDS = [
  'created',
  'updated',
  'deleted',
  'touched',
  'read',
  'recv',
  'seq',
  'clear',
  'defacs',
  'creds',
  'public',
  'trusted',
  'private',
  '_aux',
  '_deleted',
] as const;

const SUBSCRIPTION_FIELDS = [
  'updated',
  'mode',
  'read',
  'recv',
  'clear',
  'lastSeen',
  'userAgent',
] as const;

const MESSAGE_FIELDS = [
  'topic',
  'seq',
  'ts',
  '_status',
  'from',
  'head',
  'content',
] as const;

const noop = () => {};

function hasOwn(source: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, field);
}

function copyOwnFields(
  source: object,
  target: object,
  fields: readonly string[]
): void {
  fields.forEach((field) => {
    if (hasOwn(source, field)) {
      const value: unknown = Reflect.get(source, field);
      Reflect.set(target, field, value);
    }
  });
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && value > 0 ? value : fallback;
}

function toInteger(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function toWindow(query: MessageQuery): SeqWindow {
  return {
    since: positiveOr(query.since, 0),
    before: positiveOr(query.before, MAX_SEQ),
    limit: toInteger(query.limit),
  };
}

function serializeTopic(
  existing: TopicRecord | undefined,
  topic: CacheableTopic
): TopicRecord {
  const record: TopicRecord = existing ?? { name: topic.name };
  copyOwnFields(topic, record, TOPIC_FIELDS);
  if (Array.isArray(topic._tags)) {
    record.tags = topic._tags;
  }
  if (topic.acs) {
    record.acs = topic.getAccessMode().jsonHelper();
  }
  return record;
}

function deserializeTopic(topic: CacheableTopic, source: TopicRecord): void {
  copyOwnFields(source, topic, TOPIC_FIELDS);
  if (Array.isArray(source.tags)) {
    topic._tags = source.tags;
  }
  if (source.acs) {
    topic.setAccessMode(source.acs);
  }
  topic.seq = toInteger(topic.seq);
  topic.read = toInteger(topic.read);
  topic.unread = Math.max(0, topic.seq - topic.read);
}

function serializeSubscription(
  existing: SubscriptionRecord | undefined,
  topicName: string,
  uid: string,
  sub: object
): SubscriptionRecord {
  const record: SubscriptionRecord = existing ?? { topic: topicName, uid };
  copyOwnFields(sub, record, SUBSCRIPTION_FIELDS);
  return record;
}

function serializeMessage(
  existing: MessageRecord | undefined,
  message: CacheableMessage | MessageRecord
): MessageRecord {
  const record: MessageRecord = existing ?? {
    topic: message.topic,
    seq: message.seq,
  };
  copyOwnFields(message, record, MESSAGE_FIELDS);
  return record;
}

function visitEach<T>(
  items: T[],
  callback: EachCallback<T> | undefined,
  context: unknown
): void {
  if (callback) {
    items.forEach((item) => callback.call(context, item));
  }
}

export default class PersistentCache {
  readonly #onError: PersistentCacheErrorHandler;
  readonly #logger: PersistentCacheLogger;
  readonly #adapter: StorageAdapter | null;

  constructor(
    onError: PersistentCacheErrorHandler | null | undefined,
    logger: PersistentCacheLogger | null | undefined,
    adapter: StorageAdapter | null
  ) {
    this.#onError = onError ?? noop;
    this.#logger = logger ?? noop;
    this.#adapter = adapter;
  }

  get disabled(): boolean {
    return !this.isReady();
  }

  initDatabase(): Promise<void> {
    const adapter = this.#adapter;
    if (!adapter) {
      return Promise.resolve();
    }
    return adapter.open().catch((error: unknown) => {
      this.#logger('PCache', 'failed to initialize', error);
      this.#onError(error);
      throw error;
    });
  }

  deleteDatabase(): Promise<boolean> {
    const adapter = this.#adapter;
    if (!adapter) {
      return Promise.resolve(true);
    }
    return adapter.destroy().then(
      () => true,
      (error: unknown) => {
        this.#logger('PCache', 'deleteDatabase', error);
        throw error;
      }
    );
  }

  isReady(): boolean {
    return !!this.#adapter && this.#adapter.isOpen();
  }

  updTopic(topic: CacheableTopic): Promise<void> {
    return this.#run('updTopic', undefined, async (adapter) => {
      const existing = await adapter.getTopic(topic.name);
      await adapter.putTopic(serializeTopic(existing, topic));
    });
  }

  markTopicAsDeleted(name: string, deleted: boolean): Promise<void> {
    return this.#run('markTopicAsDeleted', undefined, async (adapter) => {
      const record = await adapter.getTopic(name);
      if (record && record._deleted !== deleted) {
        await adapter.putTopic({ ...record, _deleted: deleted });
      }
    });
  }

  remTopic(name: string): Promise<void> {
    return this.#run('remTopic', undefined, (adapter) =>
      adapter.removeTopic(name)
    );
  }

  mapTopics(
    callback?: EachCallback<TopicRecord>,
    context?: unknown
  ): Promise<TopicRecord[]> {
    return this.#run('mapTopics', [], async (adapter) => {
      const records = await adapter.getTopics();
      visitEach(records, callback, context);
      return records;
    });
  }

  deserializeTopic(topic: CacheableTopic, src: TopicRecord): void {
    deserializeTopic(topic, src);
  }

  updUser(uid: string, pub?: unknown): Promise<void> {
    if (pub === undefined) {
      return Promise.resolve();
    }
    return this.#run('updUser', undefined, (adapter) =>
      adapter.putUser({ uid, public: pub })
    );
  }

  remUser(uid: string): Promise<void> {
    return this.#run('remUser', undefined, (adapter) =>
      adapter.removeUser(uid)
    );
  }

  mapUsers(
    callback?: EachCallback<UserRecord>,
    context?: unknown
  ): Promise<UserRecord[]> {
    return this.#run('mapUsers', [], async (adapter) => {
      const records = await adapter.getUsers();
      visitEach(records, callback, context);
      return records;
    });
  }

  getUser(uid: string): Promise<CachedUser | undefined> {
    return this.#run<CachedUser | undefined>(
      'getUser',
      undefined,
      async (adapter) => {
        const record = await adapter.getUser(uid);
        return record && { user: record.uid, public: record.public };
      }
    );
  }

  updSubscription(topicName: string, uid: string, sub: object): Promise<void> {
    return this.#run('updSubscription', undefined, async (adapter) => {
      const existing = await adapter.getSubscription(topicName, uid);
      await adapter.putSubscription(
        serializeSubscription(existing, topicName, uid, sub)
      );
    });
  }

  remSubscription(topicName: string, uid: string): Promise<void> {
    return this.#run('remSubscription', undefined, (adapter) =>
      adapter.removeSubscription(topicName, uid)
    );
  }

  mapSubscriptions(
    topicName: string,
    callback?: EachCallback<CachedSubscription>,
    context?: unknown
  ): Promise<CachedSubscription[]> {
    return this.#run('mapSubscriptions', [], async (adapter) => {
      const records = (await adapter.getSubscriptions(topicName)).map(
        (record) => ({ ...record, user: record.uid })
      );
      visitEach(records, callback, context);
      return records;
    });
  }

  addMessage(msg: CacheableMessage): Promise<void> {
    return this.#run('addMessage', undefined, (adapter) =>
      adapter.putMessage(serializeMessage(undefined, msg))
    );
  }

  updMessageStatus(
    topicName: string,
    seq: number,
    status: number
  ): Promise<void> {
    return this.#run('updMessageStatus', undefined, (adapter) =>
      adapter.updateMessageStatus(topicName, seq, status)
    );
  }

  remMessages(topicName: string, from?: number, to?: number): Promise<void> {
    return this.#run('remMessages', undefined, (adapter) => {
      const low = from ?? 0;
      const hi = to ?? 0;
      if (!low && !hi) {
        return adapter.removeMessages(topicName, 0, MAX_SEQ);
      }
      if (hi > 0) {
        return hi > low
          ? adapter.removeMessages(topicName, low, hi)
          : Promise.resolve();
      }
      return adapter.removeMessages(topicName, low, low + 1);
    });
  }

  readMessages(
    topicName: string,
    query?: MessageQuery | null,
    callback?: EachCallback<MessageRecord>,
    context?: unknown
  ): Promise<MessageRecord[]> {
    const params = query ?? {};
    return this.#run('readMessages', [], async (adapter) => {
      const records = Array.isArray(params.ranges)
        ? await adapter.readMessageRanges(topicName, params.ranges)
        : await adapter.readMessages(topicName, toWindow(params));
      visitEach(records, callback, context);
      return records;
    });
  }

  addDelLog(
    topicName: string,
    delId: number,
    ranges: SeqRange[]
  ): Promise<void> {
    return this.#run('addDelLog', undefined, (adapter) =>
      adapter.addDelLog(
        ranges.map((range) => ({
          topic: topicName,
          clear: delId,
          low: range.low,
          hi: range.hi || range.low + 1,
        }))
      )
    );
  }

  readDelLog(
    topicName: string,
    query?: MessageQuery | null
  ): Promise<DelLogRange[]> {
    const params = query ?? {};
    return this.#run('readDelLog', [], (adapter) =>
      Array.isArray(params.ranges)
        ? adapter.readDelLogRanges(topicName, params.ranges)
        : adapter.readDelLog(topicName, toWindow(params))
    );
  }

  maxDelId(topicName: string): Promise<number> {
    return this.#run('maxDelId', 0, (adapter) => adapter.maxDelId(topicName));
  }

  #run<T>(
    operation: string,
    fallback: T,
    work: (adapter: StorageAdapter) => Promise<T>
  ): Promise<T> {
    const adapter = this.#adapter;
    if (!adapter || !adapter.isOpen()) {
      return Promise.resolve(fallback);
    }
    return work(adapter).catch((error: unknown) => {
      this.#logger('PCache', operation, error);
      throw error;
    });
  }
}
