import type { SeqRange } from './wire';

export interface TopicRecord {
  name: string;
  created?: Date;
  updated?: Date;
  deleted?: Date;
  touched?: Date;
  read?: number;
  recv?: number;
  seq?: number;
  clear?: number;
  defacs?: unknown;
  creds?: unknown;
  public?: unknown;
  trusted?: unknown;
  private?: unknown;
  _aux?: unknown;
  _deleted?: boolean;
  tags?: string[];
  acs?: unknown;
}
export interface UserRecord {
  uid: string;
  public: unknown;
}
export interface SubscriptionRecord {
  topic: string;
  uid: string;
  updated?: Date;
  mode?: string;
  read?: number;
  recv?: number;
  clear?: number;
  lastSeen?: unknown;
  userAgent?: string;
}
export interface MessageRecord {
  topic: string;
  seq: number;
  ts?: Date;
  _status?: number;
  from?: string;
  head?: unknown;
  content?: unknown;
}
export interface DelLogRecord {
  topic: string;
  clear: number;
  low: number;
  hi: number;
}
export interface DelLogRange {
  low: number;
  hi: number;
}
export interface SeqWindow {
  since: number;
  before: number;
  limit: number;
}
export interface StorageAdapter {
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): Promise<void>;
  isOpen(): boolean;
  getTopics(): Promise<TopicRecord[]>;
  getTopic(name: string): Promise<TopicRecord | undefined>;
  putTopic(record: TopicRecord): Promise<void>;
  removeTopic(name: string): Promise<void>;
  getUsers(): Promise<UserRecord[]>;
  getUser(uid: string): Promise<UserRecord | undefined>;
  putUser(record: UserRecord): Promise<void>;
  removeUser(uid: string): Promise<void>;
  getSubscriptions(topic: string): Promise<SubscriptionRecord[]>;
  getSubscription(
    topic: string,
    uid: string
  ): Promise<SubscriptionRecord | undefined>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(topic: string, uid: string): Promise<void>;
  putMessage(record: MessageRecord): Promise<void>;
  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void>;
  removeMessages(topic: string, low: number, hi: number): Promise<void>;
  readMessages(topic: string, window: SeqWindow): Promise<MessageRecord[]>;
  readMessageRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

type PersistentCacheLogger = (...args: unknown[]) => void;
type PersistentCacheErrorHandler = (error: unknown) => void;
interface CacheableTopic {
  name: string;
  seq: number;
  read: number;
  unread: number;
  acs?: unknown;
  _tags?: unknown;
  getAccessMode(): {
    jsonHelper(): unknown;
  };
  setAccessMode(acs: unknown): unknown;
}
interface MessageQuery {
  since?: number;
  before?: number;
  limit?: number;
  ranges?: SeqRange[];
}
interface CacheableMessage {
  topic: string;
  seq: number;
}
type CachedSubscription = SubscriptionRecord & {
  user: string;
};
interface CachedUser {
  user: string;
  public: unknown;
}
type EachCallback<T> = (this: unknown, item: T) => void;
export declare class PersistentCache {
  #private;
  constructor(
    onError: PersistentCacheErrorHandler | null | undefined,
    logger: PersistentCacheLogger | null | undefined,
    adapter: StorageAdapter | null
  );
  get disabled(): boolean;
  initDatabase(): Promise<void>;
  deleteDatabase(): Promise<boolean>;
  isReady(): boolean;
  updTopic(topic: CacheableTopic): Promise<void>;
  markTopicAsDeleted(name: string, deleted: boolean): Promise<void>;
  remTopic(name: string): Promise<void>;
  mapTopics(
    callback?: EachCallback<TopicRecord>,
    context?: unknown
  ): Promise<TopicRecord[]>;
  deserializeTopic(topic: CacheableTopic, src: TopicRecord): void;
  updUser(uid: string, pub?: unknown): Promise<void>;
  remUser(uid: string): Promise<void>;
  mapUsers(
    callback?: EachCallback<UserRecord>,
    context?: unknown
  ): Promise<UserRecord[]>;
  getUser(uid: string): Promise<CachedUser | undefined>;
  updSubscription(topicName: string, uid: string, sub: object): Promise<void>;
  remSubscription(topicName: string, uid: string): Promise<void>;
  mapSubscriptions(
    topicName: string,
    callback?: EachCallback<CachedSubscription>,
    context?: unknown
  ): Promise<CachedSubscription[]>;
  addMessage(msg: CacheableMessage): Promise<void>;
  updMessageStatus(
    topicName: string,
    seq: number,
    status: number
  ): Promise<void>;
  remMessages(topicName: string, from?: number, to?: number): Promise<void>;
  readMessages(
    topicName: string,
    query?: MessageQuery | null,
    callback?: EachCallback<MessageRecord>,
    context?: unknown
  ): Promise<MessageRecord[]>;
  addDelLog(
    topicName: string,
    delId: number,
    ranges: SeqRange[]
  ): Promise<void>;
  readDelLog(
    topicName: string,
    query?: MessageQuery | null
  ): Promise<DelLogRange[]>;
  maxDelId(topicName: string): Promise<number>;
}

export declare class MemoryAdapter implements StorageAdapter {
  #private;
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): Promise<void>;
  isOpen(): boolean;
  getTopics(): Promise<TopicRecord[]>;
  getTopic(name: string): Promise<TopicRecord | undefined>;
  putTopic(record: TopicRecord): Promise<void>;
  removeTopic(name: string): Promise<void>;
  getUsers(): Promise<UserRecord[]>;
  getUser(uid: string): Promise<UserRecord | undefined>;
  putUser(record: UserRecord): Promise<void>;
  removeUser(uid: string): Promise<void>;
  getSubscriptions(topic: string): Promise<SubscriptionRecord[]>;
  getSubscription(
    topic: string,
    uid: string
  ): Promise<SubscriptionRecord | undefined>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(topic: string, uid: string): Promise<void>;
  putMessage(record: MessageRecord): Promise<void>;
  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void>;
  removeMessages(topic: string, low: number, hi: number): Promise<void>;
  readMessages(topic: string, window: SeqWindow): Promise<MessageRecord[]>;
  readMessageRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

interface IdbRequest<T> {
  result: T;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}
interface IdbOpenRequest extends IdbRequest<IdbDatabase> {
  onupgradeneeded: (() => void) | null;
  onblocked: (() => void) | null;
}
interface IdbCursor<T> {
  value: T;
  continue(): void;
}
interface IdbIndex {
  openCursor(
    range: unknown,
    direction: 'prev'
  ): IdbRequest<IdbCursor<{
    clear: number;
  }> | null>;
}
interface IdbObjectStore {
  indexNames: {
    contains(name: string): boolean;
  };
  get(key: unknown): IdbRequest<unknown>;
  getAll(range?: unknown): IdbRequest<unknown[]>;
  put(value: object): IdbRequest<unknown>;
  delete(key: unknown): IdbRequest<unknown>;
  openCursor(
    range: unknown,
    direction: 'prev'
  ): IdbRequest<IdbCursor<unknown> | null>;
  index(name: string): IdbIndex;
  createIndex(
    name: string,
    keyPath: string[],
    options: {
      unique: boolean;
    }
  ): unknown;
}
interface IdbTransaction {
  error: unknown;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  objectStore(name: string): IdbObjectStore;
}
interface IdbDatabase {
  objectStoreNames: {
    contains(name: string): boolean;
  };
  onversionchange: (() => void) | null;
  transaction(stores: string[], mode?: 'readwrite'): IdbTransaction;
  createObjectStore(
    name: string,
    options: {
      keyPath: string | string[];
    }
  ): IdbObjectStore;
  close(): void;
}
interface IdbFactory {
  open(name: string, version: number): IdbOpenRequest;
  deleteDatabase(name: string): IdbRequest<unknown> & {
    onblocked: (() => void) | null;
  };
}
interface IdbKeyRangeStatic {
  only(value: unknown): unknown;
  bound(
    lower: unknown,
    upper: unknown,
    lowerOpen?: boolean,
    upperOpen?: boolean
  ): unknown;
}
interface IndexedDBProvider {
  factory: IdbFactory;
  keyRange: IdbKeyRangeStatic;
}
export declare class IndexedDBAdapter implements StorageAdapter {
  #private;
  constructor(provider?: IndexedDBProvider);
  static isSupported(): boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): Promise<void>;
  isOpen(): boolean;
  getTopics(): Promise<TopicRecord[]>;
  getTopic(name: string): Promise<TopicRecord | undefined>;
  putTopic(record: TopicRecord): Promise<void>;
  removeTopic(name: string): Promise<void>;
  getUsers(): Promise<UserRecord[]>;
  getUser(uid: string): Promise<UserRecord | undefined>;
  putUser(record: UserRecord): Promise<void>;
  removeUser(uid: string): Promise<void>;
  getSubscriptions(topic: string): Promise<SubscriptionRecord[]>;
  getSubscription(
    topic: string,
    uid: string
  ): Promise<SubscriptionRecord | undefined>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(topic: string, uid: string): Promise<void>;
  putMessage(record: MessageRecord): Promise<void>;
  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void>;
  removeMessages(topic: string, low: number, hi: number): Promise<void>;
  readMessages(topic: string, window: SeqWindow): Promise<MessageRecord[]>;
  readMessageRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

type Awaitable<T> = T | Promise<T>;
export interface KeyValueStore {
  getItem(key: string): Awaitable<string | null | undefined>;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
  getAllKeys(): Awaitable<readonly string[]>;
  getMany?(
    keys: string[]
  ): Awaitable<Record<string, string | null | undefined>>;
  multiGet?(
    keys: string[]
  ): Awaitable<readonly (readonly [string, string | null | undefined])[]>;
}
interface MMKVReadWrite {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  getAllKeys(): string[];
}
export type MMKVLike = MMKVReadWrite &
  (
    | {
        remove(key: string): unknown;
      }
    | {
        delete(key: string): unknown;
      }
  );
export interface KeyValueAdapterOptions {
  prefix?: string;
}
export declare class KeyValueAdapter extends MemoryAdapter {
  #private;
  constructor(store: KeyValueStore, options?: KeyValueAdapterOptions);
  open(): Promise<void>;
  destroy(): Promise<void>;
  putTopic(record: TopicRecord): Promise<void>;
  removeTopic(name: string): Promise<void>;
  putUser(record: UserRecord): Promise<void>;
  removeUser(uid: string): Promise<void>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(topic: string, uid: string): Promise<void>;
  putMessage(record: MessageRecord): Promise<void>;
  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void>;
  removeMessages(topic: string, low: number, hi: number): Promise<void>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
}
