import { describe, expect, test } from '@jest/globals';
import {
  AsyncStore,
  FakeMMKVv3,
  FakeMMKVv4,
  SyncStore,
} from '../__fixtures__/key-value-stores';
import KeyValueAdapter, {
  fromMMKV,
  type KeyValueStore,
  type MMKVLike,
} from '../storage/key-value-adapter';
import { MAX_SEQ } from '../storage/storage-adapter';

interface ExpoSQLiteKVStore {
  getItem(key: string): Promise<string | null>;
  setItem(
    key: string,
    value: string | ((prevValue: string | null) => string)
  ): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
}

interface AsyncStorageV2 {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
  multiGet: (
    keys: readonly string[]
  ) => Promise<readonly [string, string | null][]>;
}

interface AsyncStorageV3 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getMany(keys: string[]): Promise<Record<string, string | null>>;
  getAllKeys(): Promise<string[]>;
}

interface MMKVv4 {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getString(key: string): string | undefined;
  remove(key: string): boolean;
  getAllKeys(): string[];
}

interface MMKVv3 {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getString(key: string): string | undefined;
  delete(key: string): void;
  getAllKeys(): string[];
}

type PublishedStoresFit = [
  ExpoSQLiteKVStore extends KeyValueStore ? true : never,
  AsyncStorageV2 extends KeyValueStore ? true : never,
  AsyncStorageV3 extends KeyValueStore ? true : never,
  MMKVv4 extends MMKVLike ? true : never,
  MMKVv3 extends MMKVLike ? true : never,
];

const everything = { since: 0, before: MAX_SEQ, limit: 0 };

async function openOn(store: KeyValueStore, prefix?: string) {
  const adapter = new KeyValueAdapter(store, { prefix });
  await adapter.open();
  return adapter;
}

async function seed(adapter: KeyValueAdapter) {
  await adapter.putTopic({
    name: 'grpA',
    seq: 3,
    updated: new Date('2026-10-01T10:00:00.000Z'),
  });
  await adapter.putUser({ uid: 'usr1', public: { fn: 'Alice' } });
  await adapter.putSubscription({
    topic: 'grpA',
    uid: 'usr1',
    lastSeen: { when: new Date('2026-10-02T08:30:00.000Z') },
  });
  for (let seq = 1; seq <= 3; seq++) {
    await adapter.putMessage({
      topic: 'grpA',
      seq,
      ts: new Date(`2026-10-03T0${seq}:00:00.000Z`),
      content: `m${seq}`,
    });
  }
  await adapter.addDelLog([{ topic: 'grpA', clear: 1, low: 10, hi: 12 }]);
}

describe('KeyValueAdapter', () => {
  test('a new adapter on the same store sees everything that was saved', async () => {
    const store = new SyncStore();
    await seed(await openOn(store));

    const reopened = await openOn(store);

    expect(await reopened.getTopic('grpA')).toEqual({
      name: 'grpA',
      seq: 3,
      updated: new Date('2026-10-01T10:00:00.000Z'),
    });
    expect(await reopened.getUser('usr1')).toEqual({
      uid: 'usr1',
      public: { fn: 'Alice' },
    });
    const [sub] = await reopened.getSubscriptions('grpA');
    expect(sub?.lastSeen).toEqual({
      when: new Date('2026-10-02T08:30:00.000Z'),
    });
    const messages = await reopened.readMessages('grpA', everything);
    expect(messages.map((m) => m.seq)).toEqual([3, 2, 1]);
    expect(messages[0]?.ts).toEqual(new Date('2026-10-03T03:00:00.000Z'));
    expect(await reopened.maxDelId('grpA')).toBe(1);
  });

  test('message status changes are saved', async () => {
    const store = new SyncStore();
    const adapter = await openOn(store);
    await adapter.putMessage({ topic: 'grpA', seq: 1, _status: 20 });

    await adapter.updateMessageStatus('grpA', 1, 50);

    const [message] = await (
      await openOn(store)
    ).readMessageRanges('grpA', [{ low: 1 }]);
    expect(message?._status).toBe(50);
  });

  test('removeMessages deletes stored keys in the half-open range only', async () => {
    const store = new SyncStore();
    const adapter = await openOn(store);
    for (let seq = 1; seq <= 5; seq++) {
      await adapter.putMessage({ topic: 'grpA', seq });
    }
    await adapter.putMessage({ topic: 'grpAB', seq: 3 });

    await adapter.removeMessages('grpA', 2, 4);

    expect([...store.data.keys()].sort()).toEqual([
      'tinode/msg/grpA/1',
      'tinode/msg/grpA/4',
      'tinode/msg/grpA/5',
      'tinode/msg/grpAB/3',
    ]);
  });

  test('removeTopic and destroy leave keys of other topics and other owners alone', async () => {
    const store = new SyncStore();
    store.setItem('theme', 'dark');
    const other = await openOn(store, 'other');
    await other.putTopic({ name: 'grpA' });
    const adapter = await openOn(store);
    await seed(adapter);
    await adapter.putTopic({ name: 'grpAB' });

    await adapter.removeTopic('grpA');
    expect([...store.data.keys()].sort()).toEqual([
      'other/topic/grpA',
      'theme',
      'tinode/topic/grpAB',
      'tinode/user/usr1',
    ]);

    await adapter.destroy();
    expect([...store.data.keys()].sort()).toEqual([
      'other/topic/grpA',
      'theme',
    ]);
  });

  test('records that cannot be read are skipped on open', async () => {
    const store = new SyncStore();
    store.setItem('tinode/topic/grpA', '{not json');
    store.setItem('tinode/msg/grpA/1', JSON.stringify({ topic: 'grpA' }));
    store.setItem('tinode/topic/grpB', JSON.stringify({ name: 'grpB' }));

    const adapter = await openOn(store);

    expect(await adapter.getTopics()).toEqual([{ name: 'grpB' }]);
    expect(await adapter.readMessages('grpA', everything)).toEqual([]);
  });

  test('loads with one batch read when the store has multiGet', async () => {
    const store = new AsyncStore();
    await seed(await openOn(store));
    store.getItemCalls = 0;

    await openOn(store);

    expect(store.multiGetCalls).toBe(2);
    expect(store.getItemCalls).toBe(0);
  });

  test('loads with getMany when the store has it', async () => {
    const data = new Map<string, string>();
    const store: KeyValueStore = {
      getItem: () => {
        throw new Error('getItem should not be used for loading');
      },
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
      getAllKeys: () => [...data.keys()],
      getMany: (keys) =>
        Object.fromEntries(keys.map((key) => [key, data.get(key) ?? null])),
    };
    await seed(await openOn(store));

    const reopened = await openOn(store);

    expect(await reopened.getTopics()).toHaveLength(1);
  });
});

test('the published store typings fit KeyValueStore and MMKVLike', () => {
  const fits: PublishedStoresFit = [true, true, true, true, true];
  expect(fits).toHaveLength(5);
});

describe('fromMMKV', () => {
  test.each([
    ['v4 (remove)', () => new FakeMMKVv4()],
    ['v3 (delete)', () => new FakeMMKVv3()],
  ])('works with MMKV %s', async (_name, create) => {
    const mmkv = create();
    const adapter = await openOn(fromMMKV(mmkv));
    await seed(adapter);
    await adapter.removeUser('usr1');

    const reopened = await openOn(fromMMKV(mmkv));

    expect(await reopened.getUser('usr1')).toBeUndefined();
    expect(await reopened.readMessages('grpA', everything)).toHaveLength(3);
    expect(mmkv.data.has('tinode/user/usr1')).toBe(false);
  });
});
