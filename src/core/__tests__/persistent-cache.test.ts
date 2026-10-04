import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import PersistentCache, {
  type CacheableTopic,
} from '../storage/persistent-cache';
import MemoryAdapter from '../storage/memory-adapter';

class FakeAccessMode {
  constructor(readonly mode: string) {}

  jsonHelper() {
    return { mode: this.mode };
  }
}

class FakeTopic implements CacheableTopic {
  created = new Date(1000);
  updated = new Date(2000);
  seq = 0;
  read = 0;
  recv = 0;
  unread = 0;
  public: unknown = { fn: 'Group' };
  _tags: string[] = [];
  _deleted = false;
  acs: FakeAccessMode | undefined;

  constructor(readonly name: string) {}

  getAccessMode() {
    return this.acs ?? new FakeAccessMode('');
  }

  setAccessMode(acs: unknown) {
    this.acs = new FakeAccessMode(String(Reflect.get(Object(acs), 'mode')));
  }
}

function newCache() {
  const onError = jest.fn();
  const logger = jest.fn();
  const cache = new PersistentCache(onError, logger, new MemoryAdapter());
  return { cache, onError, logger };
}

describe('PersistentCache disabled', () => {
  const cache = new PersistentCache(null, null, null);

  test('is not ready and resolves empty', async () => {
    expect(cache.isReady()).toBe(false);
    expect(cache.disabled).toBe(true);
    expect(await cache.initDatabase()).toBeUndefined();
    expect(await cache.mapTopics()).toEqual([]);
    expect(await cache.mapUsers()).toEqual([]);
    expect(await cache.mapSubscriptions('grpA')).toEqual([]);
    expect(await cache.readMessages('grpA')).toEqual([]);
    expect(await cache.readDelLog('grpA')).toEqual([]);
    expect(await cache.maxDelId('grpA')).toBe(0);
    expect(await cache.getUser('usr1')).toBeUndefined();
    expect(await cache.updTopic(new FakeTopic('grpA'))).toBeUndefined();
    expect(await cache.deleteDatabase()).toBe(true);
  });
});

describe('PersistentCache', () => {
  let cache: PersistentCache;

  beforeEach(async () => {
    cache = newCache().cache;
    await cache.initDatabase();
  });

  test('ready after init, disabled after delete', async () => {
    expect(cache.isReady()).toBe(true);
    expect(await cache.deleteDatabase()).toBe(true);
    expect(cache.isReady()).toBe(false);
  });

  test('topic serialization round trip', async () => {
    const topic = new FakeTopic('grpA');
    topic.seq = 9;
    topic.read = 4;
    topic._tags = ['a', 'b'];
    topic.setAccessMode({ mode: 'JRWP' });
    await cache.updTopic(topic);

    const records = await cache.mapTopics();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: 'grpA',
      seq: 9,
      read: 4,
      tags: ['a', 'b'],
      acs: { mode: 'JRWP' },
      public: { fn: 'Group' },
    });

    const restored = new FakeTopic('grpA');
    restored.seq = 0;
    cache.deserializeTopic(restored, records[0]!);
    expect(restored.seq).toBe(9);
    expect(restored.read).toBe(4);
    expect(restored.unread).toBe(5);
    expect(restored._tags).toEqual(['a', 'b']);
    expect(restored.acs?.mode).toBe('JRWP');
  });

  test('mapTopics invokes callback with context', async () => {
    await cache.updTopic(new FakeTopic('grpA'));
    const seen: string[] = [];
    const context = { tag: 'ctx' };
    await cache.mapTopics(function (this: unknown, record) {
      expect(this).toBe(context);
      seen.push(record.name);
    }, context);
    expect(seen).toEqual(['grpA']);
  });

  test('markTopicAsDeleted and remTopic', async () => {
    await cache.updTopic(new FakeTopic('grpA'));
    await cache.markTopicAsDeleted('grpA', true);
    expect((await cache.mapTopics())[0]?._deleted).toBe(true);
    await cache.markTopicAsDeleted('missing', true);
    await cache.remTopic('grpA');
    expect(await cache.mapTopics()).toEqual([]);
  });

  test('users', async () => {
    await cache.updUser('usr1');
    expect(await cache.mapUsers()).toEqual([]);
    await cache.updUser('usr1', { fn: 'Alice' });
    expect(await cache.getUser('usr1')).toEqual({
      user: 'usr1',
      public: { fn: 'Alice' },
    });
    expect(await cache.getUser('usr2')).toBeUndefined();
    expect(await cache.mapUsers()).toEqual([
      { uid: 'usr1', public: { fn: 'Alice' } },
    ]);
    await cache.remUser('usr1');
    expect(await cache.mapUsers()).toEqual([]);
  });

  test('subscriptions are merged and expose user', async () => {
    await cache.updSubscription('grpA', 'usr1', {
      mode: 'JRWP',
      user: 'usr1',
      online: true,
    });
    await cache.updSubscription('grpA', 'usr1', { read: 3 });
    const subs = await cache.mapSubscriptions('grpA');
    expect(subs).toEqual([
      { topic: 'grpA', uid: 'usr1', user: 'usr1', mode: 'JRWP', read: 3 },
    ]);
    await cache.remSubscription('grpA', 'usr1');
    expect(await cache.mapSubscriptions('grpA')).toEqual([]);
  });

  test('messages: add, read desc with limit, ranges, status', async () => {
    for (let seq = 1; seq <= 5; seq++) {
      const pub = { topic: 'grpA', seq, content: `m${seq}` };
      await cache.addMessage(pub);
    }
    const recent = await cache.readMessages('grpA', { limit: 2 });
    expect(recent.map((m) => m.seq)).toEqual([5, 4]);
    const windowed = await cache.readMessages('grpA', { since: 2, before: 4 });
    expect(windowed.map((m) => m.seq)).toEqual([3, 2]);
    const ranges = await cache.readMessages('grpA', {
      ranges: [{ low: 1, hi: 3 }, { low: 5 }],
    });
    expect(ranges.map((m) => m.seq)).toEqual([1, 2, 5]);

    await cache.updMessageStatus('grpA', 3, 4);
    const [third] = await cache.readMessages('grpA', { ranges: [{ low: 3 }] });
    expect(third?._status).toBe(4);
    expect(third?.content).toBe('m3');
  });

  test('remMessages single, range and all', async () => {
    for (let seq = 1; seq <= 8; seq++) {
      await cache.addMessage({ topic: 'grpA', seq });
    }
    await cache.remMessages('grpA', 8);
    await cache.remMessages('grpA', 2, 4);
    await cache.remMessages('grpA', 5, 5);
    expect(
      (await cache.readMessages('grpA')).map((message) => message.seq)
    ).toEqual([7, 6, 5, 4, 1]);
    await cache.remMessages('grpA');
    expect(await cache.readMessages('grpA')).toEqual([]);
  });

  test('del log and maxDelId', async () => {
    expect(await cache.maxDelId('grpA')).toBe(0);
    await cache.addDelLog('grpA', 3, [{ low: 2, hi: 4 }, { low: 9 }]);
    await cache.addDelLog('grpA', 5, [{ low: 20, hi: 22 }]);
    expect(await cache.maxDelId('grpA')).toBe(5);
    expect(await cache.readDelLog('grpA')).toEqual([
      { low: 20, hi: 22 },
      { low: 9, hi: 10 },
      { low: 2, hi: 4 },
    ]);
    expect(await cache.readDelLog('grpA', { limit: 2 })).toEqual([
      { low: 20, hi: 22 },
    ]);
    expect(await cache.readDelLog('grpA', { ranges: [{ low: 9 }] })).toEqual([
      { low: 9, hi: 10 },
    ]);
  });

  test('adapter failures are logged and rethrown', async () => {
    const adapter = new MemoryAdapter();
    const logger = jest.fn();
    const failing = new PersistentCache(null, logger, adapter);
    await failing.initDatabase();
    jest.spyOn(adapter, 'getUsers').mockRejectedValue(new Error('boom'));
    await expect(failing.mapUsers()).rejects.toThrow('boom');
    expect(logger).toHaveBeenCalledWith(
      'PCache',
      'mapUsers',
      expect.any(Error)
    );
  });

  test('open failure reports to onError', async () => {
    const adapter = new MemoryAdapter();
    const onError = jest.fn();
    jest.spyOn(adapter, 'open').mockRejectedValue(new Error('denied'));
    const failing = new PersistentCache(onError, null, adapter);
    await expect(failing.initDatabase()).rejects.toThrow('denied');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(failing.isReady()).toBe(false);
  });
});
