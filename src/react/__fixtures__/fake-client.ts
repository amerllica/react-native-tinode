import type {
  AuthToken,
  GetQuery,
  InfoMessage,
  Message,
  PubMessage,
  SeqRange,
} from '../../core/types';
import type {
  ClientPort,
  ContactPort,
  MessageContent,
  MeTopicPort,
  MetaQueryPort,
  SubscriberPort,
} from '../ports';

export const MY_UID = 'usrMe';
const LOCAL_SEQ_START = 0xfffffff;

class FakeQuery implements MetaQueryPort {
  dataLimit: number | undefined;

  withLaterDesc(): MetaQueryPort {
    return this;
  }

  withLaterSub(): MetaQueryPort {
    return this;
  }

  withLaterData(limit?: number): MetaQueryPort {
    this.dataLimit = limit;
    return this;
  }

  build(): GetQuery | undefined {
    return this.dataLimit === undefined
      ? {}
      : { data: { limit: this.dataLimit } };
  }
}

export function makeHistory(topic: string, count: number): Message[] {
  return Array.from({ length: count }, (_, index) => ({
    topic,
    seq: index + 1,
    from: 'usrOther',
    ts: new Date(index * 1_000),
    content: `message ${index + 1}`,
  }));
}

export class FakeTopic implements MeTopicPort {
  name: string;
  public?: unknown;
  private?: unknown;
  online?: boolean;
  touched?: Date;
  seq?: number;
  read?: number;

  history: Message[] = [];
  loaded: Message[] = [];
  contactList: ContactPort[] = [];
  subscriberList: SubscriberPort[] = [];
  attached = false;
  subscribeCalls: Array<GetQuery | undefined> = [];
  leaveCalls: boolean[] = [];
  pageRequests: Array<{ limit: number; max: number }> = [];
  keyPresses = 0;
  readNotes: Array<number | undefined> = [];
  published: PubMessage[] = [];

  onData?(data?: Message): void;
  onInfo?(info: InfoMessage): void;
  onMetaDesc?(desc: unknown): void;
  onSubsUpdated?(subs: string[], count?: number): void;
  onPres?(pres: unknown): void;
  onAllMessagesReceived?(count: number): void;
  onMetaSub?(sub: unknown): void;
  onContactUpdate?(what: string, cont: unknown): void;

  constructor(name: string) {
    this.name = name;
  }

  isSubscribed(): boolean {
    return this.attached;
  }

  async subscribe(getParams?: GetQuery): Promise<unknown> {
    this.subscribeCalls.push(getParams);
    this.attached = true;
    const limit = getParams?.data?.limit;
    if (limit !== undefined) {
      this.#deliver(this.history.slice(-limit));
    }
    return { code: 200 };
  }

  async leave(unsub?: boolean): Promise<unknown> {
    this.leaveCalls.push(unsub ?? false);
    this.attached = false;
    return { code: 200 };
  }

  startMetaQuery(): MetaQueryPort {
    return new FakeQuery();
  }

  messages(callback: (msg: Message) => void): void {
    [...this.loaded].sort((a, b) => a.seq - b.seq).forEach(callback);
  }

  async getMessagesPage(
    limit: number,
    _gaps: SeqRange[] | null,
    _min: number,
    max: number,
    _newer: boolean
  ): Promise<unknown> {
    this.pageRequests.push({ limit, max });
    const older = this.history.filter((msg) => msg.seq < max);
    this.#deliver(older.slice(-limit));
    return { code: 200 };
  }

  msgHasMoreMessages(_min: number, max: number, _newer: boolean): SeqRange[] {
    const missing = this.history.filter(
      (msg) => msg.seq < max && !this.loaded.includes(msg)
    );
    const first = missing[0];
    const last = missing[missing.length - 1];
    return first && last ? [{ low: first.seq, hi: last.seq + 1 }] : [];
  }

  minMsgSeq(): number {
    return this.loaded.reduce(
      (min, msg) => (min === 0 ? msg.seq : Math.min(min, msg.seq)),
      0
    );
  }

  createMessage(data: MessageContent, noEcho?: boolean): PubMessage {
    return { topic: this.name, content: data, noecho: noEcho };
  }

  async publishDraft(pub: PubMessage): Promise<unknown> {
    this.published.push(pub);
    const msg: Message = {
      ...pub,
      seq: LOCAL_SEQ_START + this.published.length,
      from: MY_UID,
    };
    this.#deliver([msg]);
    return { code: 200 };
  }

  msgStatus(msg: Message): number {
    return msg.from === MY_UID ? 50 : 80;
  }

  noteRead(seq?: number): void {
    this.readNotes.push(seq);
  }

  noteKeyPress(): void {
    this.keyPresses += 1;
  }

  subscribers(callback: (sub: SubscriberPort) => void): void {
    this.subscriberList.forEach(callback);
  }

  contacts(callback: (contact: ContactPort) => void): void {
    this.contactList.forEach(callback);
  }

  #deliver(messages: Message[]): void {
    for (const msg of messages) {
      if (!this.loaded.includes(msg)) {
        this.loaded.push(msg);
        this.onData?.(msg);
      }
    }
  }
}

export class FakeClient implements ClientPort {
  connected = false;
  authenticated = false;
  readonly topics = new Map<string, FakeTopic>();
  connectCalls = 0;
  reconnectCalls = 0;

  onConnect?(): void;
  onDisconnect?(err?: unknown): void;
  onLogin?(code: number, text: string): void;
  onAutoreconnectIteration?(timeout: number, promise?: Promise<unknown>): void;

  static authenticatedClient(): FakeClient {
    const client = new FakeClient();
    client.connected = true;
    client.authenticated = true;
    return client;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async connect(): Promise<unknown> {
    this.connectCalls += 1;
    this.connected = true;
    this.onConnect?.();
    return { code: 201 };
  }

  reconnect(): void {
    this.reconnectCalls += 1;
  }

  disconnect(): void {
    this.connected = false;
    this.authenticated = false;
  }

  async clearStorage(): Promise<unknown> {
    return undefined;
  }

  async loginBasic(): Promise<unknown> {
    this.authenticated = true;
    this.onLogin?.(200, 'ok');
    return { code: 200 };
  }

  async loginToken(): Promise<unknown> {
    return this.loginBasic();
  }

  getAuthToken(): AuthToken | null {
    return this.authenticated
      ? { token: 'token-1', expires: new Date(0) }
      : null;
  }

  getCurrentUserID(): string | null {
    return this.authenticated ? MY_UID : null;
  }

  isMe(uid: string): boolean {
    return uid === MY_UID;
  }

  getTopic(name: string): FakeTopic {
    const existing = this.topics.get(name);
    if (existing) {
      return existing;
    }
    const topic = new FakeTopic(name);
    this.topics.set(name, topic);
    return topic;
  }

  getMeTopic(): FakeTopic {
    return this.getTopic('me');
  }
}
