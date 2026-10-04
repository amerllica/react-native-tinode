import {
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

function messageRangeContains(range: SeqRange, seq: number): boolean {
  return range.hi ? seq >= range.low && seq < range.hi : seq === range.low;
}

function isNonEmptyRange(range: SeqRange): boolean {
  return !range.hi || range.hi > range.low;
}

function delLogOverlaps(record: DelLogRecord, since: number, before: number) {
  return record.low < before && record.hi > since;
}

function delLogRangeOf(record: DelLogRecord): DelLogRange {
  return { low: record.low, hi: record.hi };
}

function descendingDelLog(a: DelLogRecord, b: DelLogRecord): number {
  return b.low - a.low || b.hi - a.hi;
}

function getOrCreate<V>(map: Map<string, V>, key: string, create: () => V): V {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const created = create();
  map.set(key, created);
  return created;
}

export default class MemoryAdapter implements StorageAdapter {
  #open = false;
  readonly #topics = new Map<string, TopicRecord>();
  readonly #users = new Map<string, UserRecord>();
  readonly #subscriptions = new Map<string, Map<string, SubscriptionRecord>>();
  readonly #messages = new Map<string, Map<number, MessageRecord>>();
  readonly #delLog = new Map<string, Map<string, DelLogRecord>>();

  open(): Promise<void> {
    this.#open = true;
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.#open = false;
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    this.#open = false;
    this.#topics.clear();
    this.#users.clear();
    this.#subscriptions.clear();
    this.#messages.clear();
    this.#delLog.clear();
    return Promise.resolve();
  }

  isOpen(): boolean {
    return this.#open;
  }

  async getTopics(): Promise<TopicRecord[]> {
    return [...this.#topics.values()].map((record) => ({ ...record }));
  }

  async getTopic(name: string): Promise<TopicRecord | undefined> {
    const record = this.#topics.get(name);
    return record && { ...record };
  }

  async putTopic(record: TopicRecord): Promise<void> {
    this.#topics.set(record.name, { ...record });
  }

  async removeTopic(name: string): Promise<void> {
    this.#topics.delete(name);
    this.#subscriptions.delete(name);
    this.#messages.delete(name);
    this.#delLog.delete(name);
  }

  async getUsers(): Promise<UserRecord[]> {
    return [...this.#users.values()].map((record) => ({ ...record }));
  }

  async getUser(uid: string): Promise<UserRecord | undefined> {
    const record = this.#users.get(uid);
    return record && { ...record };
  }

  async putUser(record: UserRecord): Promise<void> {
    this.#users.set(record.uid, { ...record });
  }

  async removeUser(uid: string): Promise<void> {
    this.#users.delete(uid);
  }

  async getSubscriptions(topic: string): Promise<SubscriptionRecord[]> {
    const records = this.#subscriptions.get(topic);
    return records ? [...records.values()].map((r) => ({ ...r })) : [];
  }

  async getSubscription(
    topic: string,
    uid: string
  ): Promise<SubscriptionRecord | undefined> {
    const record = this.#subscriptions.get(topic)?.get(uid);
    return record && { ...record };
  }

  async putSubscription(record: SubscriptionRecord): Promise<void> {
    getOrCreate(this.#subscriptions, record.topic, () => new Map()).set(
      record.uid,
      { ...record }
    );
  }

  async removeSubscription(topic: string, uid: string): Promise<void> {
    this.#subscriptions.get(topic)?.delete(uid);
  }

  async putMessage(record: MessageRecord): Promise<void> {
    getOrCreate(this.#messages, record.topic, () => new Map()).set(record.seq, {
      ...record,
    });
  }

  async updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void> {
    const record = this.#messages.get(topic)?.get(seq);
    if (record) {
      record._status = status;
    }
  }

  async removeMessages(topic: string, low: number, hi: number): Promise<void> {
    const records = this.#messages.get(topic);
    if (!records) {
      return;
    }
    for (const seq of [...records.keys()]) {
      if (seq >= low && seq < hi) {
        records.delete(seq);
      }
    }
  }

  async readMessages(
    topic: string,
    window: SeqWindow
  ): Promise<MessageRecord[]> {
    if (window.since >= window.before) {
      return [];
    }
    const found = [...(this.#messages.get(topic)?.values() ?? [])]
      .filter((r) => r.seq >= window.since && r.seq < window.before)
      .sort((a, b) => b.seq - a.seq);
    const limited = window.limit > 0 ? found.slice(0, window.limit) : found;
    return limited.map((record) => ({ ...record }));
  }

  async readMessageRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<MessageRecord[]> {
    const sorted = [...(this.#messages.get(topic)?.values() ?? [])].sort(
      (a, b) => a.seq - b.seq
    );
    return ranges
      .filter(isNonEmptyRange)
      .flatMap((range) =>
        sorted.filter((record) => messageRangeContains(range, record.seq))
      )
      .map((record) => ({ ...record }));
  }

  async addDelLog(records: DelLogRecord[]): Promise<void> {
    records.forEach((record) => {
      getOrCreate(this.#delLog, record.topic, () => new Map()).set(
        `${record.low}:${record.hi}`,
        { ...record }
      );
    });
  }

  async readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]> {
    if (window.since >= window.before) {
      return [];
    }
    const found = this.#delLogRecords(topic)
      .filter((r) => delLogOverlaps(r, window.since, window.before))
      .sort(descendingDelLog);
    const result: DelLogRange[] = [];
    let count = 0;
    for (const record of found) {
      result.push(delLogRangeOf(record));
      count += record.hi - record.low;
      if (window.limit > 0 && count >= window.limit) {
        break;
      }
    }
    return result;
  }

  async readDelLogRanges(
    topic: string,
    ranges: SeqRange[]
  ): Promise<DelLogRange[]> {
    const records = this.#delLogRecords(topic).sort(
      (a, b) => -descendingDelLog(a, b)
    );
    return ranges.flatMap((range) => {
      const hi = range.hi || range.low + 1;
      return records
        .filter((record) => delLogOverlaps(record, range.low, hi))
        .map(delLogRangeOf);
    });
  }

  async maxDelId(topic: string): Promise<number> {
    return this.#delLogRecords(topic).reduce(
      (max, record) => Math.max(max, record.clear),
      0
    );
  }

  #delLogRecords(topic: string): DelLogRecord[] {
    return [...(this.#delLog.get(topic)?.values() ?? [])];
  }
}
