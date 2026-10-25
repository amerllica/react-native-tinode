import { describe, expect, test } from '@jest/globals';
import {
  DEL_CHAR,
  Drafty,
  fromMMKV,
  isCommError,
  KeyValueAdapter,
  MemoryAdapter,
  MESSAGE_STATUS_READ,
  MESSAGE_STATUS_SENT,
  Tinode,
  type KeyValueStore,
} from '..';

class FakeWebSocket {
  readyState = 0;
  onopen = null;
  onclose = null;
  onerror = null;
  onmessage = null;
  close(): void {}
  send(): void {}
}

class MapStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  getAllKeys(): string[] {
    return [...this.data.keys()];
  }
}

function createClient(storage: MemoryAdapter): Promise<Tinode> {
  return new Promise((resolve, reject) => {
    const client = new Tinode(
      {
        appName: 'Test/1.0',
        host: 'localhost:6060',
        apiKey: 'key',
        network: { WebSocket: FakeWebSocket },
        storage,
      },
      (err) => (err ? reject(err) : resolve(client))
    );
  });
}

describe('tinode-sdk facade', () => {
  test('re-exports the Tinode statics as constants', () => {
    expect(MESSAGE_STATUS_READ).toBe(Tinode.MESSAGE_STATUS_READ);
    expect(MESSAGE_STATUS_SENT).toBe(50);
    expect(DEL_CHAR).toBe('␡');
    expect(Tinode.getLibrary()).toMatch(/^tinodejs\//);
  });

  test('passes the storage adapter to the client', async () => {
    const client = await createClient(new MemoryAdapter());
    expect(client._db.isReady()).toBe(true);
    expect(client._connection).toBeDefined();
  });

  test('keeps the cache in a key-value store', async () => {
    const store = new MapStore();
    const adapter = new KeyValueAdapter(store);
    await adapter.open();
    await adapter.putTopic({ name: 'grpA', seq: 3 });

    const reopened = new KeyValueAdapter(store);
    await reopened.open();
    await expect(reopened.getTopic('grpA')).resolves.toMatchObject({
      name: 'grpA',
      seq: 3,
    });
  });

  test('wraps MMKV v3 and v4 stores', () => {
    const removed: string[] = [];
    const store = fromMMKV({
      getString: () => undefined,
      set: () => {},
      getAllKeys: () => [],
      remove: (key: string) => {
        removed.push(key);
        return true;
      },
    });
    store.removeItem('a');
    expect(removed).toEqual(['a']);
  });

  test('parses Drafty with graphemes', () => {
    expect(Drafty.parse('*bold* 👍🏽')?.txt).toBe('bold 👍🏽');
  });

  test('recognises CommError by name and code', () => {
    const err = Object.assign(new Error('not found'), {
      name: 'CommError',
      code: 404,
    });
    expect(isCommError(err)).toBe(true);
    expect(isCommError(new Error('plain'))).toBe(false);
    expect(isCommError({ name: 'CommError', code: 404 })).toBe(false);
  });
});
