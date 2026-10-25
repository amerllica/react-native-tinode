import type { AccessMode } from './access-mode';
import type { AutoreconnectIterationCallback, Connection } from './connection';
import type { DraftyDoc } from './drafty';
import type { LargeFileHelper } from './large-file';
import type {
  NetInfoLike,
  TinodeNetwork,
  WebSocketProviderType,
  XHRProviderType,
} from './network';
import type { PersistentCache, StorageAdapter } from './storage';
import type { Topic, TopicFnd, TopicMe } from './topic';
import type {
  AccountParams,
  AuthToken,
  CtrlMessage,
  Credential,
  DataMessage,
  GetQuery,
  InfoMessage,
  MetaMessage,
  PresMessage,
  PubMessage,
  PushPayload,
  SeqRange,
  ServerMessage,
  ServerParams,
  SetParams,
  TopicType,
} from './wire';

export interface TinodeConfig {
  appName?: string;
  host: string;
  apiKey: string;
  transport?: 'ws' | 'lp' | null;
  secure?: boolean;
  platform?: 'ios' | 'android' | 'web';
  persist?: boolean;
  storage?: StorageAdapter | null;
  netInfo?: NetInfoLike | null;
  network?: TinodeNetwork;
}
interface PendingPromise {
  resolve(ctrl: CtrlMessage): void;
  resolveMeta?(meta: MetaMessage): void;
  reject(err: Error): void;
  ts: Date;
}
export declare class Tinode {
  #private;
  static readonly MESSAGE_STATUS_NONE = 0;
  static readonly MESSAGE_STATUS_QUEUED = 10;
  static readonly MESSAGE_STATUS_SENDING = 20;
  static readonly MESSAGE_STATUS_FAILED = 30;
  static readonly MESSAGE_STATUS_FATAL = 40;
  static readonly MESSAGE_STATUS_SENT = 50;
  static readonly MESSAGE_STATUS_RECEIVED = 60;
  static readonly MESSAGE_STATUS_READ = 70;
  static readonly MESSAGE_STATUS_TO_ME = 80;
  static readonly DEL_CHAR = '\u2421';
  static readonly MAX_MESSAGE_SIZE = 'maxMessageSize';
  static readonly MAX_SUBSCRIBER_COUNT = 'maxSubscriberCount';
  static readonly MIN_TAG_LENGTH = 'minTagLength';
  static readonly MAX_TAG_LENGTH = 'maxTagLength';
  static readonly MAX_TAG_COUNT = 'maxTagCount';
  static readonly MAX_FILE_UPLOAD_SIZE = 'maxFileUploadSize';
  static readonly REQ_CRED_VALIDATORS = 'reqCred';
  static readonly MSG_DELETE_AGE = 'msgDelAge';
  static readonly URI_TOPIC_ID_PREFIX = 'tinode:///id/';
  static readonly URI_TOPIC_ALIAS_PREFIX = 'tinode:///alias/';
  static readonly TAG_ALIAS = 'alias:';
  static readonly TAG_EMAIL = 'email:';
  static readonly TAG_PHONE = 'tel:';
  _host: string;
  _secure: boolean | undefined;
  _appName: string;
  _apiKey: string;
  _browser: string;
  _platform: string;
  _hwos: string;
  _humanLanguage: string;
  _loggingEnabled: boolean;
  _trimLongStrings: boolean;
  _myUID: string | null;
  _authenticated: boolean;
  _login: string | null;
  _authToken: AuthToken | null;
  _inPacketCount: number;
  _messageId: number;
  _serverInfo: ServerParams | null;
  _deviceToken: string | null;
  _pendingPromises: Record<string, PendingPromise>;
  _expirePromises: ReturnType<typeof setInterval> | null;
  _connection: Connection;
  _persist: boolean;
  _db: PersistentCache;
  _cache: Record<string, unknown>;
  onWebsocketOpen: (() => void) | undefined;
  onConnect: (() => void) | undefined;
  onDisconnect: ((err?: Error | null) => void) | undefined;
  onLogin: ((code: number, text: string | undefined) => void) | undefined;
  onCtrlMessage: ((ctrl: CtrlMessage) => void) | undefined;
  onDataMessage: ((data: DataMessage) => void) | undefined;
  onPresMessage: ((pres: PresMessage) => void) | undefined;
  onMetaMessage: ((meta: MetaMessage) => void) | undefined;
  onInfoMessage: ((info: InfoMessage) => void) | undefined;
  onMessage: ((pkt: ServerMessage) => void) | undefined;
  onRawMessage: ((text: string) => void) | undefined;
  onNetworkProbe: (() => void) | undefined;
  onAutoreconnectIteration: AutoreconnectIterationCallback | undefined;
  constructor(config: TinodeConfig, onComplete?: (err?: unknown) => void);
  logger: (str: unknown, ...args: unknown[]) => void;
  static credential(
    meth?: string | Credential | null,
    val?: string | null,
    params?: unknown,
    resp?: string | null
  ): Credential[] | null;
  static topicType(name: string | null | undefined): TopicType | undefined;
  static isMeTopicName(name: string | null | undefined): boolean;
  static isSelfTopicName(name: string | null | undefined): boolean;
  static isGroupTopicName(name: string | null | undefined): boolean;
  static isP2PTopicName(name: string | null | undefined): boolean;
  static isCommTopicName(name: string | null | undefined): boolean;
  static isNewGroupTopicName(name: string | null | undefined): boolean;
  static isChannelTopicName(name: string | null | undefined): boolean;
  static getVersion(): string;
  /** @deprecated Pass `network: { WebSocket, XMLHttpRequest }` in the config instead. */
  static setNetworkProviders(
    wsProvider?: WebSocketProviderType | null,
    xhrProvider?: XHRProviderType | null
  ): void;
  /** @deprecated Pass `storage: new IndexedDBAdapter(provider)` in the config instead. */
  static setDatabaseProvider(idbProvider?: unknown): void;
  static getLibrary(): string;
  static isNullValue(str: unknown): boolean;
  static isServerAssignedSeq(seq: number): boolean;
  static parseTinodeUrl(tinodeUrl: unknown): string | null;
  static isValidTagValue(tag: unknown): boolean;
  static tagSplit(tag: string | null | undefined): {
    prefix: string;
    value: string;
  } | null;
  static setUniqueTag(
    tags: string[] | null | undefined,
    uniqueTag: string
  ): string[];
  static clearTagPrefix(
    tags: (string | null | undefined)[] | null | undefined,
    prefix: string
  ): string[];
  static tagByPrefix(
    tags: (string | null | undefined)[] | null | undefined,
    prefix: string
  ): string | undefined;
  getNextUniqueId(): string | undefined;
  connect(host_?: string | null): Promise<void>;
  reconnect(force?: boolean): void;
  disconnect(): void;
  clearStorage(): Promise<unknown>;
  initStorage(): Promise<unknown>;
  networkProbe(): void;
  isConnected(): boolean;
  isAuthenticated(): boolean;
  authorizeURL<T>(url: T): T | string;
  account(
    uid: string | null,
    scheme: string | null,
    secret: string | null,
    login?: boolean,
    params?: AccountParams
  ): Promise<CtrlMessage>;
  createAccount(
    scheme: string,
    secret: string,
    login?: boolean,
    params?: AccountParams
  ): Promise<CtrlMessage>;
  createAccountBasic(
    username: string | null | undefined,
    password: string | null | undefined,
    params?: AccountParams
  ): Promise<CtrlMessage>;
  updateAccountBasic(
    uid: string | null,
    username: string | null | undefined,
    password: string | null | undefined,
    params?: AccountParams
  ): Promise<CtrlMessage>;
  hello(): Promise<CtrlMessage | undefined>;
  setDeviceToken(dt: string | null | undefined | false): boolean;
  login(
    scheme: string,
    secret: string,
    cred?: Credential[] | null
  ): Promise<CtrlMessage>;
  loginBasic(
    uname: string,
    password: string,
    cred?: Credential[] | null
  ): Promise<CtrlMessage>;
  loginToken(token: string, cred?: Credential[] | null): Promise<CtrlMessage>;
  requestResetAuthSecret(
    scheme: string,
    method: string,
    value: string
  ): Promise<CtrlMessage>;
  getAuthToken(): AuthToken | null;
  setAuthToken(token: AuthToken | null): void;
  subscribe(
    topicName: string,
    getParams?: GetQuery,
    setParams?: SetParams
  ): Promise<CtrlMessage>;
  leave(topic: string, unsub?: boolean): Promise<CtrlMessage>;
  createMessage(
    topic: string,
    content: DraftyDoc | string,
    noEcho?: boolean
  ): PubMessage;
  publish(
    topicName: string,
    content: DraftyDoc | string,
    noEcho?: boolean
  ): Promise<CtrlMessage>;
  publishMessage(
    pub: PubMessage,
    attachments?: string[] | null
  ): Promise<CtrlMessage>;
  oobNotification(data: PushPayload): void;
  getMeta(topic: string, params?: GetQuery): Promise<CtrlMessage | MetaMessage>;
  setMeta(topic: string, params: SetParams): Promise<CtrlMessage>;
  delMessages(
    topic: string,
    ranges: SeqRange[],
    hard?: boolean
  ): Promise<CtrlMessage>;
  delTopic(topicName: string, hard?: boolean): Promise<CtrlMessage>;
  delSubscription(topicName: string, user: string): Promise<CtrlMessage>;
  delCredential(method: string, value: string): Promise<CtrlMessage>;
  delCurrentUser(hard?: boolean): Promise<void>;
  note(topicName: string, what: 'recv' | 'read', seq: number): void;
  noteKeyPress(topicName: string, type?: 'kp' | 'kpa' | 'kpv'): void;
  videoCall(
    topicName: string,
    seq: number,
    evt: string,
    payload?: unknown
  ): void;
  getTopic(topicName: 'me'): TopicMe;
  getTopic(topicName: 'fnd'): TopicFnd;
  getTopic(topicName: string | null | undefined): Topic | undefined;
  cacheGetTopic(topicName: string | null | undefined): Topic | undefined;
  cacheRemTopic(topicName: string): void;
  mapTopics(
    func: (topic: Topic, key: string) => boolean | void,
    context?: unknown
  ): void;
  isTopicCached(topicName: string): boolean;
  newGroupTopicName(isChan?: boolean): string;
  getMeTopic(): TopicMe;
  getFndTopic(): TopicFnd;
  getLargeFileHelper(): LargeFileHelper;
  getCurrentUserID(): string | null;
  isMe(uid: string | null | undefined): boolean;
  getCurrentLogin(): string | null;
  getServerInfo(): ServerParams | null;
  report(action: string, target: string): Promise<CtrlMessage>;
  getServerParam(name: string, defaultValue?: unknown): unknown;
  enableLogging(enabled: boolean, trimLongStrings?: boolean): void;
  setHumanLanguage(hl: string | null | undefined): void;
  isTopicOnline(name: string): boolean;
  getTopicAccessMode(name: string): AccessMode | null;
  wantAkn(status: boolean): void;
}
