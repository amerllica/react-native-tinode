export interface SeqRange {
  low: number;
  hi?: number;
}

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

export const MAX_SEQ = Number.MAX_SAFE_INTEGER;
