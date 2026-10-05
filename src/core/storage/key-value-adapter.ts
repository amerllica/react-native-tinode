import { reviveTimestamp } from '../utils';
import MemoryAdapter from './memory-adapter';
import type {
  DelLogRecord,
  MessageRecord,
  SubscriptionRecord,
  TopicRecord,
  UserRecord,
} from './storage-adapter';

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
  ({ remove(key: string): unknown } | { delete(key: string): unknown });

export interface KeyValueAdapterOptions {
  prefix?: string;
}

const DEFAULT_PREFIX = 'tinode';

export function fromMMKV(mmkv: MMKVLike): KeyValueStore {
  return {
    getItem: (key) => mmkv.getString(key),
    setItem: (key, value) => mmkv.set(key, value),
    removeItem: (key) =>
      'remove' in mmkv ? mmkv.remove(key) : mmkv.delete(key),
    getAllKeys: () => mmkv.getAllKeys(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
    typeof value.clear === 'number' &&
    typeof value.low === 'number' &&
    typeof value.hi === 'number'
  );
}

function parse(raw: string | null | undefined): unknown {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw, reviveTimestamp);
  } catch {
    return undefined;
  }
}

export default class KeyValueAdapter extends MemoryAdapter {
  readonly #store: KeyValueStore;
  readonly #prefix: string;

  constructor(store: KeyValueStore, options: KeyValueAdapterOptions = {}) {
    super();
    this.#store = store;
    this.#prefix = `${options.prefix ?? DEFAULT_PREFIX}/`;
  }

  async open(): Promise<void> {
    const keys = (await this.#store.getAllKeys()).filter((key) =>
      key.startsWith(this.#prefix)
    );
    for (const [key, raw] of await this.#readAll(keys)) {
      await this.#restore(key.slice(this.#prefix.length), parse(raw));
    }
    await super.open();
  }

  async destroy(): Promise<void> {
    await super.destroy();
    await this.#removeWhere(() => true);
  }

  async putTopic(record: TopicRecord): Promise<void> {
    await super.putTopic(record);
    await this.#save(`topic/${record.name}`, record);
  }

  async removeTopic(name: string): Promise<void> {
    await super.removeTopic(name);
    await this.#removeWhere(
      (path) =>
        path === `topic/${name}` ||
        path.startsWith(`sub/${name}/`) ||
        path.startsWith(`msg/${name}/`) ||
        path.startsWith(`del/${name}/`)
    );
  }

  async putUser(record: UserRecord): Promise<void> {
    await super.putUser(record);
    await this.#save(`user/${record.uid}`, record);
  }

  async removeUser(uid: string): Promise<void> {
    await super.removeUser(uid);
    await this.#store.removeItem(this.#prefix + `user/${uid}`);
  }

  async putSubscription(record: SubscriptionRecord): Promise<void> {
    await super.putSubscription(record);
    await this.#save(`sub/${record.topic}/${record.uid}`, record);
  }

  async removeSubscription(topic: string, uid: string): Promise<void> {
    await super.removeSubscription(topic, uid);
    await this.#store.removeItem(this.#prefix + `sub/${topic}/${uid}`);
  }

  async putMessage(record: MessageRecord): Promise<void> {
    await super.putMessage(record);
    await this.#save(`msg/${record.topic}/${record.seq}`, record);
  }

  async updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void> {
    await super.updateMessageStatus(topic, seq, status);
    const [record] = await super.readMessageRanges(topic, [{ low: seq }]);
    if (record) {
      await this.#save(`msg/${topic}/${seq}`, record);
    }
  }

  async removeMessages(topic: string, low: number, hi: number): Promise<void> {
    await super.removeMessages(topic, low, hi);
    const messages = `msg/${topic}/`;
    await this.#removeWhere((path) => {
      if (!path.startsWith(messages)) {
        return false;
      }
      const seq = Number(path.slice(messages.length));
      return seq >= low && seq < hi;
    });
  }

  async addDelLog(records: DelLogRecord[]): Promise<void> {
    await super.addDelLog(records);
    for (const record of records) {
      await this.#save(
        `del/${record.topic}/${record.low}/${record.hi}`,
        record
      );
    }
  }

  async #readAll(
    keys: string[]
  ): Promise<readonly (readonly [string, string | null | undefined])[]> {
    if (this.#store.getMany) {
      const values = await this.#store.getMany(keys);
      return keys.map((key) => [key, values[key]] as const);
    }
    if (this.#store.multiGet) {
      return this.#store.multiGet(keys);
    }
    const pairs: [string, string | null | undefined][] = [];
    for (const key of keys) {
      pairs.push([key, await this.#store.getItem(key)]);
    }
    return pairs;
  }

  async #restore(path: string, value: unknown): Promise<void> {
    const kind = path.slice(0, path.indexOf('/'));
    if (kind === 'topic' && isTopicRecord(value)) {
      await super.putTopic(value);
    } else if (kind === 'user' && isUserRecord(value)) {
      await super.putUser(value);
    } else if (kind === 'sub' && isSubscriptionRecord(value)) {
      await super.putSubscription(value);
    } else if (kind === 'msg' && isMessageRecord(value)) {
      await super.putMessage(value);
    } else if (kind === 'del' && isDelLogRecord(value)) {
      await super.addDelLog([value]);
    }
  }

  async #save(path: string, record: object): Promise<void> {
    await this.#store.setItem(this.#prefix + path, JSON.stringify(record));
  }

  async #removeWhere(matches: (path: string) => boolean): Promise<void> {
    for (const key of await this.#store.getAllKeys()) {
      if (
        key.startsWith(this.#prefix) &&
        matches(key.slice(this.#prefix.length))
      ) {
        await this.#store.removeItem(key);
      }
    }
  }
}
