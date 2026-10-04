import {
  MAX_SEQ,
  type DelLogRange,
  type DelLogRecord,
  type MessageRecord,
  type SeqRange,
  type SeqWindow,
  type StorageAdapter,
  type SubscriptionRecord,
  type TopicRecord,
  type UserRecord,
} from './storage-adapter';

const DB_VERSION = 3;
const DB_NAME = 'tinode-web';

const STORE_TOPIC = 'topic';
const STORE_USER = 'user';
const STORE_SUBSCRIPTION = 'subscription';
const STORE_MESSAGE = 'message';
const STORE_DELLOG = 'dellog';
const INDEX_TOPIC_CLEAR = 'topic_clear';

const KEY_LOW_STRING = '-';
const KEY_HIGH_STRING = '~';

export interface IdbRequest<T> {
  result: T;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

export interface IdbOpenRequest extends IdbRequest<IdbDatabase> {
  onupgradeneeded: (() => void) | null;
  onblocked: (() => void) | null;
}

export interface IdbCursor<T> {
  value: T;
  continue(): void;
}

export interface IdbIndex {
  openCursor(
    range: unknown,
    direction: 'prev'
  ): IdbRequest<IdbCursor<{ clear: number }> | null>;
}

export interface IdbObjectStore {
  indexNames: { contains(name: string): boolean };
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
    options: { unique: boolean }
  ): unknown;
}

export interface IdbTransaction {
  error: unknown;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  objectStore(name: string): IdbObjectStore;
}

export interface IdbDatabase {
  objectStoreNames: { contains(name: string): boolean };
  onversionchange: (() => void) | null;
  transaction(stores: string[], mode?: 'readwrite'): IdbTransaction;
  createObjectStore(
    name: string,
    options: { keyPath: string | string[] }
  ): IdbObjectStore;
  close(): void;
}

export interface IdbFactory {
  open(name: string, version: number): IdbOpenRequest;
  deleteDatabase(name: string): IdbRequest<unknown> & {
    onblocked: (() => void) | null;
  };
}

export interface IdbKeyRangeStatic {
  only(value: unknown): unknown;
  bound(
    lower: unknown,
    upper: unknown,
    lowerOpen?: boolean,
    upperOpen?: boolean
  ): unknown;
}

export interface IndexedDBProvider {
  factory: IdbFactory;
  keyRange: IdbKeyRangeStatic;
}

function hasFunctions(value: unknown, names: string[]): boolean {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    names.every((name) => typeof Reflect.get(value, name) === 'function')
  );
}

function isIdbFactory(value: unknown): value is IdbFactory {
  return hasFunctions(value, ['open', 'deleteDatabase']);
}

function isIdbKeyRange(value: unknown): value is IdbKeyRangeStatic {
  return hasFunctions(value, ['only', 'bound']);
}

function detectProvider(): IndexedDBProvider | null {
  const factory: unknown = Reflect.get(globalThis, 'indexedDB');
  const keyRange: unknown = Reflect.get(globalThis, 'IDBKeyRange');
  return isIdbFactory(factory) && isIdbKeyRange(keyRange)
    ? { factory, keyRange }
    : null;
}

function requestResult<T>(request: IdbRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IdbTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function isNonEmptyRange(range: SeqRange): boolean {
  return !range.hi || range.hi > range.low;
}

function toDelLogRange(entry: DelLogRecord): DelLogRange {
  return { low: entry.low, hi: entry.hi };
}

function createStores(db: IdbDatabase): void {
  if (!db.objectStoreNames.contains(STORE_TOPIC)) {
    db.createObjectStore(STORE_TOPIC, { keyPath: 'name' });
  }
  if (!db.objectStoreNames.contains(STORE_USER)) {
    db.createObjectStore(STORE_USER, { keyPath: 'uid' });
  }
  if (!db.objectStoreNames.contains(STORE_SUBSCRIPTION)) {
    db.createObjectStore(STORE_SUBSCRIPTION, { keyPath: ['topic', 'uid'] });
  }
  if (!db.objectStoreNames.contains(STORE_MESSAGE)) {
    db.createObjectStore(STORE_MESSAGE, { keyPath: ['topic', 'seq'] });
  }
  if (!db.objectStoreNames.contains(STORE_DELLOG)) {
    const delLog = db.createObjectStore(STORE_DELLOG, {
      keyPath: ['topic', 'low', 'hi'],
    });
    if (!delLog.indexNames.contains(INDEX_TOPIC_CLEAR)) {
      delLog.createIndex(INDEX_TOPIC_CLEAR, ['topic', 'clear'], {
        unique: false,
      });
    }
  }
}

export default class IndexedDBAdapter implements StorageAdapter {
  #db: IdbDatabase | null = null;
  readonly #provider: IndexedDBProvider | null;

  constructor(provider?: IndexedDBProvider) {
    this.#provider = provider ?? detectProvider();
  }

  static isSupported(): boolean {
    return detectProvider() !== null;
  }

  open(): Promise<void> {
    if (this.#db) {
      return Promise.resolve();
    }
    const { factory } = this.#requireProvider();
    return new Promise((resolve, reject) => {
      const request = factory.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => createStores(request.result);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.#db = null;
        };
        this.#db = db;
        resolve();
      };
    });
  }

  close(): Promise<void> {
    this.#db?.close();
    this.#db = null;
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    const { factory } = this.#requireProvider();
    this.#db?.close();
    this.#db = null;
    return new Promise((resolve, reject) => {
      const request = factory.deleteDatabase(DB_NAME);
      request.onblocked = () => reject(new Error('blocked'));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  isOpen(): boolean {
    return this.#db !== null;
  }

  async getTopics(): Promise<TopicRecord[]> {
    return this.#getAll(STORE_TOPIC, isTopicRecord);
  }

  async getTopic(name: string): Promise<TopicRecord | undefined> {
    return this.#get(STORE_TOPIC, name, isTopicRecord);
  }

  async putTopic(record: TopicRecord): Promise<void> {
    return this.#put(STORE_TOPIC, record);
  }

  async removeTopic(name: string): Promise<void> {
    const { keyRange } = this.#requireProvider();
    const transaction = this.#transaction(
      [STORE_TOPIC, STORE_SUBSCRIPTION, STORE_MESSAGE, STORE_DELLOG],
      'readwrite'
    );
    transaction.objectStore(STORE_TOPIC).delete(keyRange.only(name));
    transaction
      .objectStore(STORE_SUBSCRIPTION)
      .delete(keyRange.bound([name, KEY_LOW_STRING], [name, KEY_HIGH_STRING]));
    transaction
      .objectStore(STORE_MESSAGE)
      .delete(keyRange.bound([name, 0], [name, MAX_SEQ]));
    transaction
      .objectStore(STORE_DELLOG)
      .delete(keyRange.bound([name, 0, 0], [name, MAX_SEQ, MAX_SEQ]));
    return transactionDone(transaction);
  }

  async getUsers(): Promise<UserRecord[]> {
    return this.#getAll(STORE_USER, isUserRecord);
  }

  async getUser(uid: string): Promise<UserRecord | undefined> {
    return this.#get(STORE_USER, uid, isUserRecord);
  }

  async putUser(record: UserRecord): Promise<void> {
    return this.#put(STORE_USER, record);
  }

  async removeUser(uid: string): Promise<void> {
    return this.#delete(STORE_USER, uid);
  }

  async getSubscriptions(topic: string): Promise<SubscriptionRecord[]> {
    const { keyRange } = this.#requireProvider();
    return this.#getAll(
      STORE_SUBSCRIPTION,
      isSubscriptionRecord,
      keyRange.bound([topic, KEY_LOW_STRING], [topic, KEY_HIGH_STRING])
    );
  }

  async getSubscription(
    topic: string,
    uid: string
  ): Promise<SubscriptionRecord | undefined> {
    return this.#get(STORE_SUBSCRIPTION, [topic, uid], isSubscriptionRecord);
  }

  async putSubscription(record: SubscriptionRecord): Promise<void> {
    return this.#put(STORE_SUBSCRIPTION, record);
  }

  async removeSubscription(topic: string, uid: string): Promise<void> {
    return this.#delete(STORE_SUBSCRIPTION, [topic, uid]);
  }

  async putMessage(record: MessageRecord): Promise<void> {
    return this.#put(STORE_MESSAGE, record);
  }

  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void> {
    const transaction = this.#transaction([STORE_MESSAGE], 'readwrite');
    const store = transaction.objectStore(STORE_MESSAGE);
    const request = store.get([topic, seq]);
    request.onsuccess = () => {
      const record = request.result;
      if (isMessageRecord(record) && record._status !== status) {
        store.put({ ...record, _status: status });
      }
    };
    return transactionDone(transaction);
  }

  async removeMessages(topic: string, low: number, hi: number): Promise<void> {
    if (hi <= low) {
      return;
    }
    const { keyRange } = this.#requireProvider();
    const transaction = this.#transaction([STORE_MESSAGE], 'readwrite');
    transaction
      .objectStore(STORE_MESSAGE)
      .delete(keyRange.bound([topic, low], [topic, hi], false, true));
    return transactionDone(transaction);
  }

  async readMessages(
    topic: string,
    window: SeqWindow
  ): Promise<MessageRecord[]> {
    if (window.since >= window.before) {
      return [];
    }
    const { keyRange } = this.#requireProvider();
    const range = keyRange.bound(
      [topic, window.since],
      [topic, window.before],
      false,
      true
    );
    const store = this.#transaction([STORE_MESSAGE]).objectStore(STORE_MESSAGE);
    return this.#collectDescending(store, range, window.limit, () => 1).then(
      (values) => values.filter(isMessageRecord)
    );
  }

  async readMessageRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<MessageRecord[]> {
    const { keyRange } = this.#requireProvider();
    const store = this.#transaction([STORE_MESSAGE]).objectStore(STORE_MESSAGE);
    const batches = await Promise.all(
      ranges.filter(isNonEmptyRange).map((range) => {
        const key = range.hi
          ? keyRange.bound([topic, range.low], [topic, range.hi], false, true)
          : keyRange.only([topic, range.low]);
        return requestResult(store.getAll(key));
      })
    );
    return batches.flat().filter(isMessageRecord);
  }

  async addDelLog(records: DelLogRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    const transaction = this.#transaction([STORE_DELLOG], 'readwrite');
    const store = transaction.objectStore(STORE_DELLOG);
    records.forEach((record) => store.put(record));
    return transactionDone(transaction);
  }

  async readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]> {
    if (window.since >= window.before) {
      return [];
    }
    const { keyRange } = this.#requireProvider();
    const range = keyRange.bound(
      [topic, 0, 0],
      [topic, window.before, 0],
      false,
      true
    );
    const store = this.#transaction([STORE_DELLOG]).objectStore(STORE_DELLOG);
    const entries = await this.#collectDescending(
      store,
      range,
      window.limit,
      (value) => (isDelLogRecord(value) ? value.hi - value.low : 0),
      (value) => isDelLogRecord(value) && value.hi > window.since
    );
    return entries.filter(isDelLogRecord).map(toDelLogRange);
  }

  async readDelLogRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<DelLogRange[]> {
    const { keyRange } = this.#requireProvider();
    const store = this.#transaction([STORE_DELLOG]).objectStore(STORE_DELLOG);
    const batches = await Promise.all(
      ranges.map(async (range) => {
        const hi = range.hi || range.low + 1;
        const entries = await requestResult(
          store.getAll(
            keyRange.bound([topic, 0, 0], [topic, hi, 0], false, true)
          )
        );
        return entries
          .filter(isDelLogRecord)
          .filter((entry) => entry.hi > range.low)
          .map(toDelLogRange);
      })
    );
    return batches.flat();
  }

  async maxDelId(topic: string): Promise<number> {
    const { keyRange } = this.#requireProvider();
    const index = this.#transaction([STORE_DELLOG])
      .objectStore(STORE_DELLOG)
      .index(INDEX_TOPIC_CLEAR);
    const cursor = await requestResult(
      index.openCursor(keyRange.bound([topic, 0], [topic, MAX_SEQ]), 'prev')
    );
    return cursor ? cursor.value.clear : 0;
  }

  #requireProvider(): IndexedDBProvider {
    if (!this.#provider) {
      throw new Error('IndexedDB is not available');
    }
    return this.#provider;
  }

  #transaction(stores: string[], mode?: 'readwrite'): IdbTransaction {
    if (!this.#db) {
      throw new Error('not initialized');
    }
    return this.#db.transaction(stores, mode);
  }

  async #getAll<T>(
    store: string,
    guard: (value: unknown) => value is T,
    range?: unknown
  ): Promise<T[]> {
    const request = this.#transaction([store]).objectStore(store).getAll(range);
    return (await requestResult(request)).filter(guard);
  }

  async #get<T>(
    store: string,
    key: unknown,
    guard: (value: unknown) => value is T
  ): Promise<T | undefined> {
    const request = this.#transaction([store]).objectStore(store).get(key);
    const result = await requestResult(request);
    return guard(result) ? result : undefined;
  }

  #put(store: string, record: object): Promise<void> {
    const transaction = this.#transaction([store], 'readwrite');
    transaction.objectStore(store).put(record);
    return transactionDone(transaction);
  }

  #delete(store: string, key: unknown): Promise<void> {
    const transaction = this.#transaction([store], 'readwrite');
    transaction.objectStore(store).delete(key);
    return transactionDone(transaction);
  }

  #collectDescending(
    store: IdbObjectStore,
    range: unknown,
    limit: number,
    weigh: (value: unknown) => number,
    accept: (value: unknown) => boolean = () => true
  ): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const values: unknown[] = [];
      let total = 0;
      const request = store.openCursor(range, 'prev');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(values);
          return;
        }
        if (accept(cursor.value)) {
          values.push(cursor.value);
          total += weigh(cursor.value);
        }
        if (limit > 0 && total >= limit) {
          resolve(values);
          return;
        }
        cursor.continue();
      };
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMessageRecord(value: unknown): value is MessageRecord {
  return (
    isRecord(value) &&
    typeof value.topic === 'string' &&
    typeof value.seq === 'number'
  );
}

function isDelLogRecord(value: unknown): value is DelLogRecord {
  return (
    isRecord(value) &&
    typeof value.topic === 'string' &&
    typeof value.low === 'number' &&
    typeof value.hi === 'number' &&
    typeof value.clear === 'number'
  );
}

function isTopicRecord(value: unknown): value is TopicRecord {
  return isRecord(value) && typeof value.name === 'string';
}

function isUserRecord(value: unknown): value is UserRecord {
  return isRecord(value) && typeof value.uid === 'string';
}

function isSubscriptionRecord(value: unknown): value is SubscriptionRecord {
  return (
    isRecord(value) &&
    typeof value.topic === 'string' &&
    typeof value.uid === 'string'
  );
}
