import type { AccessMode, AccessModeInput } from './access-mode';
import type { DraftyDoc } from './drafty';
import type { PersistentCache } from './storage';
import type { Tinode } from './tinode';
import type {
  CtrlMessage,
  Credential,
  DefAcs,
  GetDataType,
  GetDelType,
  GetOptsType,
  GetQuery,
  GetSubType,
  InfoMessage,
  LastSeen,
  Message,
  MetaMessage,
  PresMessage,
  PresWhat,
  PubMessage,
  SeqRange,
  SetParams,
  TopicDesc,
  TopicPrivate,
  TopicSubscription,
  TopicType,
} from './wire';

type Comparator<T> = (a: T, b: T) => number;
type ForEachCallback<T> = (
  elem: T,
  prev: T | undefined,
  next: T | undefined,
  index: number
) => void;
type FilterCallback<T> = (elem: T, index: number) => boolean;
declare class CBuffer<T> {
  #private;
  buffer: T[];
  constructor(compare?: Comparator<T> | null, unique?: boolean);
  getAt(at: number): T | undefined;
  getLast(filter?: FilterCallback<T> | null): T | undefined;
  put(items: T[]): void;
  put(...items: T[]): void;
  delAt(at: number): T | undefined;
  delRange(since: number, before: number): T[];
  length(): number;
  reset(): void;
  forEach(
    callback: ForEachCallback<T>,
    startIdx?: number,
    beforeIdx?: number,
    context?: unknown
  ): void;
  find(elem: T, nearest?: boolean): number;
  filter(callback: FilterCallback<T>, context?: unknown): void;
  isEmpty(): boolean;
}

export type MessageCallback = (
  data: Message,
  prev: Message | undefined,
  next: Message | undefined,
  idx: number
) => void;
export type SubscriberCallback = (
  sub: TopicSubscription,
  key: string,
  all: Record<string, TopicSubscription>
) => void;
type ReceiptKind = 'recv' | 'read';
export interface TopicCallbacks {
  onData?: (data?: Message) => void;
  onMeta?: (meta: MetaMessage) => void;
  onPres?: (pres: PresMessage) => void;
  onInfo?: (info: InfoMessage) => void;
  onMetaDesc?: (topic: Topic) => void;
  onMetaSub?: (sub: TopicSubscription) => void;
  onSubsUpdated?: (keys: string[], count?: number) => void;
  onTagsUpdated?: (tags: string[]) => void;
  onCredsUpdated?: (creds: Credential[]) => void;
  onAuxUpdated?: (aux: Record<string, unknown>) => void;
  onDeleteTopic?: () => void;
  onAllMessagesReceived?: (count: number) => void;
}
export declare class Topic {
  #private;
  name: string;
  created: Date | undefined;
  updated: Date | undefined;
  touched: Date;
  deleted: Date | undefined;
  acs: AccessMode;
  defacs: DefAcs | undefined;
  private: TopicPrivate | null;
  public: unknown;
  trusted: unknown;
  seq: number;
  read: number;
  recv: number;
  unread: number;
  clear: number;
  subcnt: number;
  online: boolean | undefined;
  seen: LastSeen | undefined;
  topic: string | undefined;
  _users: Record<string, TopicSubscription>;
  _queuedSeqId: number;
  _maxSeq: number;
  _minSeq: number;
  _noEarlierMsgs: boolean;
  _maxDel: number;
  _recvNotificationTimer: ReturnType<typeof setTimeout> | null;
  _tags: string[];
  _credentials: Credential[];
  _aux: Record<string, unknown>;
  _messageVersions: Record<number, CBuffer<Message>>;
  _messages: CBuffer<Message>;
  _attached: boolean;
  _lastSubsUpdate: Date;
  _new?: boolean;
  _deleted: boolean;
  _delayedLeaveTimer: ReturnType<typeof setTimeout> | null;
  onData: TopicCallbacks['onData'];
  onMeta: TopicCallbacks['onMeta'];
  onPres: TopicCallbacks['onPres'];
  onInfo: TopicCallbacks['onInfo'];
  onMetaDesc: TopicCallbacks['onMetaDesc'];
  onMetaSub: TopicCallbacks['onMetaSub'];
  onSubsUpdated: TopicCallbacks['onSubsUpdated'];
  onTagsUpdated: TopicCallbacks['onTagsUpdated'];
  onCredsUpdated: TopicCallbacks['onCredsUpdated'];
  onAuxUpdated: TopicCallbacks['onAuxUpdated'];
  onDeleteTopic: TopicCallbacks['onDeleteTopic'];
  onAllMessagesReceived: TopicCallbacks['onAllMessagesReceived'];
  _cacheGetUser: (uid: string) => TopicSubscription | undefined;
  _cachePutUser: (uid: string, user: TopicSubscription) => void;
  _cacheDelUser: (uid: string) => void;
  _cachePutSelf: () => void;
  _cacheDelSelf: () => void;
  constructor(name: string, callbacks?: TopicCallbacks);
  get _tinode(): Tinode;
  set _tinode(tinode: Tinode);
  static topicType(name: string | null | undefined): TopicType | undefined;
  static isMeTopicName(name: string | null | undefined): boolean;
  static isSelfTopicName(name: string | null | undefined): boolean;
  static isGroupTopicName(name: string | null | undefined): boolean;
  static isP2PTopicName(name: string | null | undefined): boolean;
  static isCommTopicName(name: string | null | undefined): boolean;
  static isNewGroupTopicName(name: string | null | undefined): boolean;
  static isChannelTopicName(name: string | null | undefined): boolean;
  isSubscribed(): boolean;
  subscribe(
    getParams?: GetQuery,
    setParams?: SetParams
  ): Promise<CtrlMessage | Topic>;
  createMessage(data: DraftyDoc | string, noEcho?: boolean): PubMessage;
  publish(
    data: DraftyDoc | string,
    noEcho?: boolean
  ): Promise<CtrlMessage | undefined>;
  publishMessage(pub: PubMessage): Promise<CtrlMessage | undefined>;
  publishDraft(
    pub: PubMessage,
    prom?: Promise<unknown> | null
  ): Promise<CtrlMessage | undefined>;
  leave(unsub?: boolean): Promise<CtrlMessage>;
  leaveDelayed(unsub: boolean, delay: number): void;
  getMeta(params?: GetQuery): Promise<CtrlMessage | MetaMessage>;
  getMessagesPage(
    limit: number,
    gaps: SeqRange[] | null | undefined,
    min: number,
    max: number,
    newer: boolean
  ): Promise<CtrlMessage | MetaMessage>;
  getPinnedMessages(): Promise<number | CtrlMessage | MetaMessage>;
  setMeta(params: SetParams): Promise<CtrlMessage>;
  updateMode(uid: string | null, update: string): Promise<CtrlMessage>;
  invite(uid: string, mode?: string | null): Promise<CtrlMessage>;
  archive(arch: boolean): Promise<CtrlMessage | boolean>;
  pinMessage(seq: number, pin: boolean): Promise<CtrlMessage | void>;
  pinTopic(_topic: string, _pin?: boolean): Promise<CtrlMessage | string[]>;
  pinnedTopicRank(_topic: string): number;
  delMessages(ranges: SeqRange[], hard?: boolean): Promise<CtrlMessage>;
  delMessagesAll(hardDel?: boolean): Promise<CtrlMessage | void>;
  delMessagesList(list: number[], hardDel?: boolean): Promise<CtrlMessage>;
  delMessagesEdits(seq: number, hardDel?: boolean): Promise<CtrlMessage>;
  delTopic(hard?: boolean): Promise<CtrlMessage | null>;
  delSubscription(user: string): Promise<CtrlMessage>;
  note(what: ReceiptKind, seq: number): void;
  noteRecv(seq: number): void;
  noteRead(seq?: number): void;
  noteKeyPress(): void;
  noteRecording(audioOnly?: boolean): void;
  videoCall(evt: string, seq: number, payload?: unknown): void;
  _updateMyReadRecv(
    what: ReceiptKind | 'msg',
    seq?: number,
    ts?: Date
  ): boolean;
  userDesc(uid: string): TopicSubscription | undefined;
  p2pPeerDesc(): TopicSubscription | undefined;
  subscribers(callback?: SubscriberCallback, context?: unknown): void;
  tags(): string[];
  aux(key: string): unknown;
  alias(): string | undefined;
  subscriber(uid: string): TopicSubscription | undefined;
  messageVersions(
    origSeq: number,
    callback?: MessageCallback,
    context?: unknown
  ): void;
  messages(
    callback?: MessageCallback,
    sinceId?: number,
    beforeId?: number,
    context?: unknown
  ): void;
  findMessage(seq: number): Message | undefined;
  latestMessage(): Message | undefined;
  latestMsgVersion(seq: number): Message | null;
  maxMsgSeq(): number;
  minMsgSeq(): number;
  maxClearId(): number;
  messageCount(): number;
  queuedMessages(callback: MessageCallback, context?: unknown): void;
  msgReceiptCount(what: ReceiptKind, seq: number): number;
  msgReadCount(seq: number): number;
  msgRecvCount(seq: number): number;
  msgHasMoreMessages(min: number, max: number, newer: boolean): SeqRange[];
  isNewMessage(seqId: number): boolean;
  flushMessage(seqId: number): Message | undefined;
  flushMessageRange(fromId: number, untilId: number): Message[];
  swapMessageId(pub: Message, newSeqId: number): void;
  cancelSend(seqId: number): boolean;
  getType(): TopicType | undefined;
  getAccessMode(): AccessMode;
  setAccessMode(acs?: AccessModeInput | null): AccessMode;
  getDefaultAccess(): DefAcs | undefined;
  startMetaQuery(): MetaGetBuilder;
  isArchived(): boolean;
  isMeType(): boolean;
  isSelfType(): boolean;
  isChannelType(): boolean;
  isGroupType(): boolean;
  isP2PType(): boolean;
  isCommType(): boolean;
  msgStatus(msg: Message, upd?: boolean): number;
  _maybeUpdateMessageVersionsCache(msg: Message): void;
  _routeData(data: Message): void;
  _routeMeta(meta: MetaMessage): void;
  _routePres(pres: PresMessage): void;
  _routeInfo(info: InfoMessage): void;
  _processMetaDesc(desc: TopicDesc): void;
  _processMetaSubs(subs: TopicSubscription[], skipSubcnt?: boolean): void;
  _processMetaTags(tags: string[] | string): void;
  _processMetaCreds(_creds: Credential[], _upd?: boolean): void;
  _processMetaAux(aux: Record<string, unknown> | string | null): void;
  _processDelMessages(clear: number, delseq?: SeqRange[]): void;
  _allMessagesReceived(count: number): void;
  _resetSub(): void;
  _gone(): void;
  _updateCachedUser(uid: string, obj: TopicSubscription): TopicSubscription;
  _getQueuedSeqId(): number;
  _loadMessages(db: PersistentCache, query?: GetDataType): Promise<number>;
  _updateReceived(seq: number | undefined, act?: string): void;
}

interface MetaWhat {
  data?: GetDataType;
  sub?: GetSubType;
  desc?: GetOptsType;
  tags?: true;
  cred?: true;
  aux?: true;
  del?: GetDelType;
}
type MetaWhatKey = keyof MetaWhat;
export declare class MetaGetBuilder {
  #private;
  topic: Topic;
  what: MetaWhat;
  constructor(parent: Topic);
  withData(since?: number, before?: number, limit?: number): this;
  withLaterData(limit?: number): this;
  withDataRanges(ranges: SeqRange[], limit?: number): this;
  withDataList(list: number[]): this;
  withEarlierData(limit?: number): this;
  withDesc(ims?: Date): this;
  withLaterDesc(): this;
  withSub(ims?: Date, limit?: number, userOrTopic?: string): this;
  withOneSub(ims?: Date, userOrTopic?: string): this;
  withLaterOneSub(userOrTopic?: string): this;
  withLaterSub(limit?: number): this;
  withTags(): this;
  withCred(): this;
  withAux(): this;
  withDel(since?: number, limit?: number): this;
  withLaterDel(limit?: number): this;
  extract<K extends MetaWhatKey>(what: K): MetaWhat[K];
  build(): GetQuery | undefined;
}

export type FoundContactCallback = (
  contact: TopicSubscription,
  key: string,
  all: Record<string, TopicSubscription>
) => void;
export declare class TopicFnd extends Topic {
  _contacts: Record<string, TopicSubscription>;
  constructor(callbacks?: TopicCallbacks);
  _processMetaSubs(subs: TopicSubscription[]): void;
  publish(): Promise<never>;
  setMeta(params: SetParams): Promise<CtrlMessage>;
  checkTagUniqueness(tag: string, caller: string): Promise<boolean>;
  contacts(callback?: FoundContactCallback, context?: unknown): void;
}

export type ContactCallback = (contact: Topic, key: string) => void;
export interface TopicMeCallbacks extends TopicCallbacks {
  onContactUpdate?: (what: PresWhat, cont: Topic) => void;
}
export declare class TopicMe extends Topic {
  onContactUpdate: TopicMeCallbacks['onContactUpdate'];
  constructor(callbacks?: TopicMeCallbacks);
  _processMetaDesc(desc: TopicDesc): void;
  _processMetaSubs(subs: TopicSubscription[]): void;
  _processMetaCreds(creds: Credential[], upd?: boolean): void;
  _routePres(pres: PresMessage): void;
  _refreshContact(what: PresWhat, cont: Topic): void;
  publish(): Promise<never>;
  delCredential(method: string, value: string): Promise<CtrlMessage>;
  contacts(
    callback: ContactCallback,
    filter?: ((contact: Topic) => boolean) | null,
    context?: unknown
  ): void;
  getContact(name: string): Topic | undefined;
  getAccessMode(): AccessMode;
  getAccessMode(name?: string): AccessMode | null;
  isArchived(name?: string): boolean;
  getCredentials(): Credential[];
  pinTopic(topic: string, pin?: boolean): Promise<CtrlMessage | string[]>;
  pinnedTopicRank(topic: string): number;
}
