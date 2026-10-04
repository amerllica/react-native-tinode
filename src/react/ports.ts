import type { DraftyDoc } from '../core/drafty';
import type {
  AuthToken,
  GetQuery,
  InfoMessage,
  Message,
  PubMessage,
  SeqRange,
} from '../core/types';

export type MessageContent = string | DraftyDoc;

export interface MetaQueryPort {
  withLaterDesc(): MetaQueryPort;
  withLaterSub(limit?: number): MetaQueryPort;
  withLaterData(limit?: number): MetaQueryPort;
  build(): GetQuery | undefined;
}

export interface SubscriberPort {
  user?: string;
  public?: unknown;
  online?: boolean;
}

export interface TopicPort {
  name: string;
  public?: unknown;
  private?: unknown;
  online?: boolean;
  isSubscribed(): boolean;
  subscribe(getParams?: GetQuery): Promise<unknown>;
  leave(unsub?: boolean): Promise<unknown>;
  startMetaQuery(): MetaQueryPort;
  messages(callback: (msg: Message) => void): void;
  getMessagesPage(
    limit: number,
    gaps: SeqRange[] | null,
    min: number,
    max: number,
    newer: boolean
  ): Promise<unknown>;
  msgHasMoreMessages(min: number, max: number, newer: boolean): SeqRange[];
  minMsgSeq(): number;
  createMessage(data: MessageContent, noEcho?: boolean): PubMessage;
  publishDraft(pub: PubMessage, prom?: Promise<unknown>): Promise<unknown>;
  msgStatus(msg: Message, upd?: boolean): number;
  subscribers(callback: (sub: SubscriberPort) => void): void;
  noteRead(seq?: number): void;
  noteKeyPress(): void;
  onData?(data?: Message): void;
  onInfo?(info: InfoMessage): void;
  onMetaDesc?(desc: unknown): void;
  onSubsUpdated?(subs: string[], count?: number): void;
  onPres?(pres: unknown): void;
  onAllMessagesReceived?(count: number): void;
}

export interface ContactPort {
  name: string;
  public?: unknown;
  online?: boolean;
  touched?: Date | null;
  seq?: number;
  read?: number;
}

export interface MeTopicPort extends TopicPort {
  contacts(callback: (contact: ContactPort) => void): void;
  onMetaSub?(sub: unknown): void;
  onContactUpdate?(what: string, cont: unknown): void;
}

export interface ClientPort {
  isConnected(): boolean;
  isAuthenticated(): boolean;
  connect(host?: string): Promise<unknown>;
  reconnect(force?: boolean): void;
  disconnect(): void;
  clearStorage(): Promise<unknown>;
  loginBasic(uname: string, password: string): Promise<unknown>;
  loginToken(token: string): Promise<unknown>;
  getAuthToken(): AuthToken | null;
  getCurrentUserID(): string | null;
  isMe(uid: string): boolean;
  getTopic(name: string): TopicPort | undefined;
  getMeTopic(): MeTopicPort;
  onConnect?(): void;
  onDisconnect?(err?: unknown): void;
  onLogin?(code: number, text: string): void;
  onAutoreconnectIteration?(timeout: number, promise?: Promise<unknown>): void;
}
