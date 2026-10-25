type AccessValue = number | string | null | undefined;
export interface AccessModeInput {
  given?: AccessValue;
  want?: AccessValue;
  mode?: AccessValue;
}
export interface AccessModeJson {
  mode: string | null;
  given: string | null;
  want: string | null;
}
export declare class AccessMode {
  #private;
  static readonly _NONE = 0;
  static readonly _JOIN = 1;
  static readonly _READ = 2;
  static readonly _WRITE = 4;
  static readonly _PRES = 8;
  static readonly _APPROVE = 16;
  static readonly _SHARE = 32;
  static readonly _DELETE = 64;
  static readonly _OWNER = 128;
  static readonly _BITMASK: number;
  static readonly _INVALID = 1048576;
  given?: number | null;
  want?: number | null;
  mode?: number | null;
  constructor(acs?: AccessModeInput | null);
  static decode(str: AccessValue): number | null;
  static encode(val: number | null | undefined): string | null;
  static update(
    val: number | null | undefined,
    upd: AccessValue
  ): number | null | undefined;
  static diff(a1: AccessValue, a2: AccessValue): number;
  toString(): string;
  jsonHelper(): AccessModeJson;
  setMode(m: AccessValue): this;
  updateMode(u: AccessValue): this;
  getMode(): string | null;
  setGiven(g: AccessValue): this;
  updateGiven(u: AccessValue): this;
  getGiven(): string | null;
  setWant(w: AccessValue): this;
  updateWant(u: AccessValue): this;
  getWant(): string | null;
  getMissing(): string | null;
  getExcessive(): string | null;
  updateAll(val?: AccessModeInput | null): this;
  isOwner(side?: string): boolean;
  isPresencer(side?: string): boolean;
  isMuted(side?: string): boolean;
  isJoiner(side?: string): boolean;
  isReader(side?: string): boolean;
  isWriter(side?: string): boolean;
  isApprover(side?: string): boolean;
  isAdmin(side?: string): boolean;
  isSharer(side?: string): boolean;
  isDeleter(side?: string): boolean;
}

type CardCommProto = 'tel' | 'email' | 'tinode' | 'http' | 'impp';
export interface CardName {
  surname?: string;
  given?: string;
  additional?: string;
  prefix?: string;
  suffix?: string;
}
export interface CardOrg {
  fn?: string;
  title?: string;
}
export interface CardPhoto {
  type?: string;
  data?: string;
  ref?: string;
}
interface CardBirthday {
  y?: number;
  m: number;
  d: number;
}
export interface CardComm {
  proto: CardCommProto;
  des: string[];
  value: string;
}
export interface CardData {
  fn?: string;
  n?: CardName;
  org?: CardOrg;
  note?: string;
  bday?: CardBirthday;
  photo?: CardPhoto | '\u2421';
  comm?: CardComm[];
}
type MaybeCard = CardData | null | undefined;
export interface TheCard extends CardData {}
export declare class TheCard {
  static contentType: string;
  constructor(
    fn?: string,
    imageUrl?: string,
    imageMimeType?: string,
    note?: string
  );
  merge(other: CardData): void;
  get contentType(): string;
  get size(): number;
  static setFn(card: MaybeCard, fn?: string | null): CardData;
  static getFn(card: MaybeCard): string | null;
  static setNote(card: MaybeCard, note?: string | null): CardData;
  static setPhoto(
    card: MaybeCard,
    imageUrl?: string | null,
    imageMimeType?: string | null
  ): CardData;
  static getPhotoUrl(card: MaybeCard): string | null;
  static getOrg(card: MaybeCard): string | null;
  static setPhone(card: MaybeCard, phone: string, type?: string): CardData;
  static setEmail(card: MaybeCard, email: string, type?: string): CardData;
  static setTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type?: string
  ): CardData;
  static addPhone(card: MaybeCard, phone: string, type?: string): CardData;
  static addEmail(card: MaybeCard, email: string, type?: string): CardData;
  static addTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type?: string
  ): CardData;
  static clearPhone<T extends MaybeCard>(
    card: T,
    phone?: string,
    type?: string
  ): T;
  static clearEmail<T extends MaybeCard>(
    card: T,
    email?: string,
    type?: string
  ): T;
  static clearTinodeID<T extends MaybeCard>(
    card: T,
    tinodeID?: string,
    type?: string
  ): T;
  static getComm(card: MaybeCard, proto: string): CardComm[];
  static getEmails(card: MaybeCard): string[];
  static getPhones(card: MaybeCard): string[];
  static getFirstTinodeID(card: MaybeCard): string | null;
  static exportVCard(card: MaybeCard): string | null;
  static importVCard(vcardStr: unknown): CardData | null;
  static isFileSupported(type?: string | null, name?: string | null): boolean;
}

type DraftyEntityType =
  'AU' | 'BN' | 'EX' | 'HT' | 'IM' | 'LN' | 'MN' | 'TC' | 'VC' | 'VD';
type DraftyStyleType =
  | DraftyEntityType
  | 'BR'
  | 'CO'
  | 'DL'
  | 'EM'
  | 'FM'
  | 'HD'
  | 'HL'
  | 'QQ'
  | 'RW'
  | 'ST';
type DraftyJsonObject = {
  readonly [key: string]: unknown;
};
export interface DraftyEntData extends CardData {
  act?: string;
  aonly?: boolean;
  duration?: number;
  height?: number;
  incoming?: boolean;
  mime?: string;
  name?: string;
  premime?: string;
  preref?: string;
  preview?: string;
  ref?: string;
  size?: number;
  state?: string;
  title?: string;
  url?: string;
  val?: string | DraftyJsonObject;
  vc?: boolean;
  width?: number;
  _tempPreview?: string;
  _processing?: boolean;
}
export interface DraftyFmt {
  at?: number;
  len?: number;
  tp?: DraftyStyleType;
  key?: number;
}
export interface DraftyEnt {
  tp: DraftyStyleType;
  data?: DraftyEntData;
}
export interface DraftyDoc {
  txt?: string;
  fmt?: DraftyFmt[];
  ent?: DraftyEnt[];
}
export type DraftySource = DraftyDoc | string | null | undefined;
export interface DraftyNode {
  type?: DraftyStyleType;
  text?: string;
  data?: DraftyEntData;
  key?: number;
  att?: boolean;
  children?: DraftyNode[] | null;
  parent?: DraftyNode;
}
export type DraftyFormatter<R> = (
  style: DraftyStyleType | undefined,
  data: DraftyEntData | undefined,
  values: (R | string)[] | null,
  index: number,
  stack: DraftyStyleType[] | undefined
) => R | null | undefined;
type DraftyEntityCallback = (
  data: DraftyEntData | undefined,
  index: number,
  tp: DraftyStyleType
) => unknown;
type DraftyStyleCallback = (
  tp: DraftyStyleType | undefined,
  at: number | undefined,
  len: number | undefined,
  key: number | undefined,
  index: number
) => unknown;
type DraftyLogger = (message: string, ...args: unknown[]) => void;
type DraftyAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;
interface ImageDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  width?: number;
  height?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<string>;
}
interface VideoDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  preref?: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<[string | undefined, string | undefined]>;
}
interface AudioDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  duration?: number;
  preview?: string;
  filename?: string;
  size?: number;
  urlPromise?: Promise<string>;
}
interface AttachmentDesc {
  mime?: string;
  data?: string;
  filename?: string;
  size?: number;
  refurl?: string;
  urlPromise?: Promise<string>;
}
interface LinkData {
  txt: string;
  url: string;
}
interface VideoCallUpdate {
  state?: string;
  duration?: number;
  incoming?: boolean;
  vc?: boolean;
}
type ButtonActionType = 'url' | 'pub';
export declare class Drafty implements DraftyDoc {
  txt: string;
  fmt: DraftyFmt[];
  ent: DraftyEnt[];
  static logger?: DraftyLogger | null;
  static readonly contentType = 'text/x-drafty';
  static init(plainText?: unknown): DraftyDoc | null;
  static parse(content: string): DraftyDoc;
  static parse(content: unknown): DraftyDoc | null;
  static append(first: DraftyDoc, second: DraftySource): DraftyDoc;
  static append(
    first: DraftyDoc | null | undefined,
    second: DraftySource
  ): DraftySource;
  static insertImage(
    content: DraftyDoc | null | undefined,
    at: number,
    imageDesc: ImageDesc
  ): DraftyDoc;
  static insertVideo(
    content: DraftyDoc | null | undefined,
    at: number,
    videoDesc: VideoDesc
  ): DraftyDoc;
  static insertAudio(
    content: DraftyDoc | null | undefined,
    at: number,
    audioDesc: AudioDesc
  ): DraftyDoc;
  static videoCall(audioOnly?: boolean): DraftyDoc;
  static updateVideoCall<T extends DraftyDoc | null | undefined>(
    content: T,
    params: VideoCallUpdate
  ): T;
  static quote(header: string, uid: string, body: DraftySource): DraftyDoc;
  static mention(name: string | null | undefined, uid: string): DraftyDoc;
  static appendLink(
    content: DraftyDoc | null | undefined,
    linkData: LinkData
  ): DraftyDoc;
  static appendImage(
    content: DraftyDoc | null | undefined,
    imageDesc: ImageDesc
  ): DraftyDoc;
  static appendAudio(
    content: DraftyDoc | null | undefined,
    audioDesc: AudioDesc
  ): DraftyDoc;
  static attachFile(
    content: DraftyDoc | null | undefined,
    attachmentDesc: AttachmentDesc
  ): DraftyDoc;
  static wrapInto(
    content: DraftyDoc | string,
    style: DraftyStyleType,
    at?: number,
    len?: number
  ): DraftyDoc;
  static wrapAsForm(
    content: DraftyDoc | string,
    at?: number,
    len?: number
  ): DraftyDoc;
  static insertButton(
    content: DraftySource,
    at: number,
    len: number,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null;
  static appendButton(
    content: DraftyDoc | null | undefined,
    title: string,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null;
  static attachJSON(
    content: DraftyDoc | null | undefined,
    data: DraftyJsonObject
  ): DraftyDoc;
  static appendLineBreak(content: DraftyDoc | null | undefined): DraftyDoc;
  static appendTheCard(
    content: DraftyDoc | null | undefined,
    theCardData: CardData
  ): DraftyDoc;
  static UNSAFE_toHTML(doc: DraftySource): string | null;
  static format<R>(
    original: DraftySource,
    formatter: DraftyFormatter<R>,
    context?: unknown
  ): R | null | undefined;
  static shorten(
    original: DraftySource,
    limit: number,
    light?: boolean
  ): DraftyDoc;
  static forwardedContent(original: DraftySource): DraftyDoc;
  static replyContent(original: DraftySource, limit: number): DraftySource;
  static preview(
    original: DraftySource,
    limit: number,
    forwarding?: boolean
  ): DraftyDoc;
  static toPlainText(content: DraftyDoc | string): string | undefined;
  static isPlainText(content: DraftyDoc | string): boolean;
  static toMarkdown(content: DraftySource): string | null;
  static isValid(content: unknown): boolean;
  static hasAttachments(content: DraftyDoc): boolean;
  static attachments(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void;
  static hasEntities(content: DraftySource): boolean;
  static entities(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void;
  static styles(
    content: DraftyDoc,
    callback: DraftyStyleCallback,
    context?: unknown
  ): void;
  static sanitizeEntities<T extends DraftyDoc | null | undefined>(
    content: T
  ): T;
  static getDownloadUrl(entData: DraftyEntData): string | null;
  static isProcessing(entData: DraftyEntData): boolean;
  static getPreviewUrl(entData: DraftyEntData): string | null;
  static getEntitySize(entData: DraftyEntData): number;
  static getEntityMimeType(entData: DraftyEntData): string;
  static tagName(style: DraftyStyleType | undefined): string | undefined;
  static attrValue(
    style: DraftyStyleType | undefined,
    data: DraftyEntData | null | undefined
  ): DraftyAttributes | null | undefined;
  static getContentType(): string;
  static isFormResponseType(mimeType: string | null | undefined): boolean;
}

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

export interface SeqRange$1 {
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
    ranges: SeqRange$1[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange$1[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

type PersistentCacheLogger = (...args: unknown[]) => void;
type PersistentCacheErrorHandler = (error: unknown) => void;
interface CacheableTopic {
  name: string;
  seq: number;
  read: number;
  unread: number;
  acs?: unknown;
  _tags?: unknown;
  getAccessMode(): {
    jsonHelper(): unknown;
  };
  setAccessMode(acs: unknown): unknown;
}
interface MessageQuery {
  since?: number;
  before?: number;
  limit?: number;
  ranges?: SeqRange$1[];
}
interface CacheableMessage {
  topic: string;
  seq: number;
}
type CachedSubscription = SubscriptionRecord & {
  user: string;
};
interface CachedUser {
  user: string;
  public: unknown;
}
type EachCallback<T> = (this: unknown, item: T) => void;
declare class PersistentCache {
  #private;
  constructor(
    onError: PersistentCacheErrorHandler | null | undefined,
    logger: PersistentCacheLogger | null | undefined,
    adapter: StorageAdapter | null
  );
  get disabled(): boolean;
  initDatabase(): Promise<void>;
  deleteDatabase(): Promise<boolean>;
  isReady(): boolean;
  updTopic(topic: CacheableTopic): Promise<void>;
  markTopicAsDeleted(name: string, deleted: boolean): Promise<void>;
  remTopic(name: string): Promise<void>;
  mapTopics(
    callback?: EachCallback<TopicRecord>,
    context?: unknown
  ): Promise<TopicRecord[]>;
  deserializeTopic(topic: CacheableTopic, src: TopicRecord): void;
  updUser(uid: string, pub?: unknown): Promise<void>;
  remUser(uid: string): Promise<void>;
  mapUsers(
    callback?: EachCallback<UserRecord>,
    context?: unknown
  ): Promise<UserRecord[]>;
  getUser(uid: string): Promise<CachedUser | undefined>;
  updSubscription(topicName: string, uid: string, sub: object): Promise<void>;
  remSubscription(topicName: string, uid: string): Promise<void>;
  mapSubscriptions(
    topicName: string,
    callback?: EachCallback<CachedSubscription>,
    context?: unknown
  ): Promise<CachedSubscription[]>;
  addMessage(msg: CacheableMessage): Promise<void>;
  updMessageStatus(
    topicName: string,
    seq: number,
    status: number
  ): Promise<void>;
  remMessages(topicName: string, from?: number, to?: number): Promise<void>;
  readMessages(
    topicName: string,
    query?: MessageQuery | null,
    callback?: EachCallback<MessageRecord>,
    context?: unknown
  ): Promise<MessageRecord[]>;
  addDelLog(
    topicName: string,
    delId: number,
    ranges: SeqRange$1[]
  ): Promise<void>;
  readDelLog(
    topicName: string,
    query?: MessageQuery | null
  ): Promise<DelLogRange[]>;
  maxDelId(topicName: string): Promise<number>;
}

export interface SeqRange {
  low: number;
  hi?: number;
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

export interface GetOptsType {
  ims?: Date;
  limit?: number;
}
interface GetSubType extends GetOptsType {
  user?: string;
  topic?: string;
}
export interface GetDataType {
  since?: number;
  before?: number;
  limit?: number;
  ranges?: SeqRange[];
}
interface GetDelType {
  since?: number;
  limit?: number;
}
export interface GetQuery {
  what?: string;
  desc?: GetOptsType;
  sub?: GetSubType;
  data?: GetDataType;
  del?: GetDelType;
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

export type TopicType = 'me' | 'fnd' | 'grp' | 'p2p' | 'sys' | 'slf';
export interface DefAcs {
  auth?: string;
  anon?: string;
}
export interface AuthToken {
  token: string;
  expires: Date;
}
export interface Credential {
  meth: string;
  val?: string;
  resp?: string;
  params?: unknown;
  done?: boolean;
}
export interface LastSeen {
  when?: Date;
  ua?: string;
}
export interface TopicPrivate {
  arch?: boolean;
  tpin?: string[];
  comment?: string;
  [key: string]: unknown;
}
export interface TopicDesc {
  created?: Date;
  updated?: Date;
  touched?: Date;
  deleted?: Date;
  defacs?: DefAcs;
  acs?: AccessMode;
  seq?: number;
  read?: number;
  recv?: number;
  clear?: number;
  unread?: number;
  subcnt?: number;
  online?: boolean;
  seen?: LastSeen;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  _noForwarding?: boolean;
}
export interface TopicSubscription {
  user?: string;
  topic?: string;
  created?: Date;
  updated?: Date;
  touched?: Date;
  deleted?: Date;
  acs?: AccessMode;
  mode?: string;
  seq?: number;
  read?: number;
  recv?: number;
  clear?: number;
  unread?: number;
  online?: boolean;
  seen?: LastSeen;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  _noForwarding?: boolean;
}
export interface MessageHead {
  'mime'?: string;
  'replace'?: string;
  'forwarded'?: string;
  'webrtc'?: string;
  'webrtc-duration'?: number;
  'vc'?: boolean;
  [key: string]: unknown;
}
export interface Message {
  id?: string;
  topic: string;
  seq: number;
  from?: string;
  ts?: Date;
  head?: MessageHead | null;
  content?: DraftyDoc | string;
  noecho?: boolean;
  low?: number;
  hi?: number;
  _deleted?: boolean;
  _sending?: boolean;
  _failed?: boolean;
  _fatal?: boolean;
  _cancelled?: boolean;
  _status?: number;
  _noForwarding?: boolean;
  _origTs?: Date;
  _origSeq?: number;
}
export interface PubMessage extends Omit<Message, 'seq'> {
  seq?: number;
}
export interface CtrlParams {
  what?: string;
  count?: number;
  seq?: number;
  del?: number;
  acs?: AccessMode;
  user?: string;
  token?: string;
  expires?: Date;
  unsub?: boolean;
  ver?: string;
  build?: string;
  sid?: string;
  [key: string]: unknown;
}
export interface CtrlMessage {
  id?: string;
  topic?: string;
  code: number;
  text?: string;
  ts?: Date;
  params?: CtrlParams;
}
export interface DataMessage {
  topic: string;
  from?: string;
  ts: Date;
  seq: number;
  head?: MessageHead;
  content?: DraftyDoc | string;
}
export interface DelValues {
  clear: number;
  delseq: SeqRange[];
}
export interface MetaMessage {
  id?: string;
  topic: string;
  ts?: Date;
  desc?: TopicDesc;
  sub?: TopicSubscription[];
  tags?: string[];
  cred?: Credential[];
  del?: DelValues;
  aux?: Record<string, unknown>;
}
export type PresWhat =
  | 'on'
  | 'off'
  | 'ua'
  | 'upd'
  | 'gone'
  | 'acs'
  | 'term'
  | 'msg'
  | 'read'
  | 'recv'
  | 'del'
  | 'tags'
  | 'aux';
export interface PresMessage {
  topic?: string;
  src?: string;
  what: PresWhat;
  seq?: number;
  clear?: number;
  delseq?: SeqRange[];
  ua?: string;
  act?: string;
  tgt?: string;
  dacs?: AccessModeInput;
  _noForwarding?: boolean;
}
export type InfoWhat = 'kp' | 'kpa' | 'kpv' | 'recv' | 'read' | 'call';
export interface InfoMessage {
  topic?: string;
  src?: string;
  from?: string;
  what: InfoWhat;
  seq?: number;
  event?: string;
  payload?: unknown;
  _noForwarding?: boolean;
}
export interface ServerMessage {
  ctrl?: CtrlMessage;
  data?: DataMessage;
  meta?: MetaMessage;
  pres?: PresMessage;
  info?: InfoMessage;
}
export interface ServerParams {
  ver?: string;
  build?: string;
  sid?: string;
  [key: string]: unknown;
}
export interface SetDesc {
  defacs?: DefAcs;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  acs?: AccessMode;
  updated?: Date;
  _noForwarding?: boolean;
}
export interface SetSub {
  user?: string | null;
  mode?: string | null;
  topic?: string;
  acs?: AccessMode;
  updated?: Date;
  _noForwarding?: boolean;
}
export interface SetParams {
  desc?: SetDesc;
  sub?: SetSub;
  tags?: string[];
  cred?: Credential;
  aux?: Record<string, unknown>;
  attachments?: string[];
}
export interface AccountParams {
  defacs?: DefAcs;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  tags?: string[];
  cred?: Credential[];
  scheme?: string;
  secret?: string;
  attachments?: string[];
}
export interface HiPacket {
  id?: string;
  ver?: string;
  ua?: string;
  dev?: string | null;
  lang?: string;
  platf?: string;
}
export interface AccPacket {
  id?: string;
  user: string | null;
  scheme: string | null;
  secret: string | null;
  tmpscheme?: string;
  tmpsecret?: string;
  login?: boolean;
  tags?: string[];
  desc: SetDesc;
  cred?: Credential[];
}
export interface LoginPacket {
  id?: string;
  scheme: string;
  secret: string;
  cred?: Credential[] | null;
}
export interface SubPacket {
  id?: string;
  topic: string;
  get?: GetQuery;
  set: {
    desc?: SetDesc;
    sub?: SetSub;
    tags?: string[];
    aux?: Record<string, unknown>;
  };
}
export interface LeavePacket {
  id?: string;
  topic: string;
  unsub?: boolean;
}
export interface GetPacket extends GetQuery {
  id?: string;
  topic: string;
}
export interface SetPacket {
  id?: string;
  topic: string;
  desc?: SetDesc;
  sub?: SetSub;
  tags?: string[];
  cred?: Credential;
  aux?: Record<string, unknown>;
}
export type DelWhat = 'msg' | 'topic' | 'sub' | 'cred' | 'user';
export interface DelPacket {
  id?: string;
  topic: string | null;
  what: DelWhat;
  delseq?: SeqRange[];
  user?: string;
  cred?: {
    meth: string;
    val: string;
  };
  hard?: boolean;
}
export type NoteWhat = 'recv' | 'read' | 'kp' | 'kpa' | 'kpv' | 'call';
export interface NotePacket {
  id?: string;
  topic: string;
  what: NoteWhat;
  seq?: number;
  event?: string;
  payload?: unknown;
}
export interface ClientMessage {
  hi?: HiPacket;
  acc?: AccPacket;
  login?: LoginPacket;
  sub?: SubPacket;
  leave?: LeavePacket;
  pub?: PubMessage;
  get?: GetPacket;
  set?: SetPacket;
  del?: DelPacket;
  note?: NotePacket;
  extra?: {
    attachments: string[];
  };
}
export interface PushPayload {
  what: string;
  topic?: string;
  seq?: number;
  xfrom?: string;
  modeGiven?: string;
  modeWant?: string;
}

export declare class CommError extends Error {
  code: number;
  constructor(message: string, code: number);
}

type Handler$1<E> = {
  bivarianceHack(evt: E): void;
}['bivarianceHack'];
export interface WebSocketLike {
  readonly OPEN?: number;
  readyState: number;
  onopen: ((evt: unknown) => void) | null;
  onclose: ((evt: unknown) => void) | null;
  onerror: ((evt: unknown) => void) | null;
  onmessage: ((evt: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}
export interface LongPollRequestLike {
  readyState: number;
  status: number;
  responseText: string;
  onreadystatechange: Handler$1<unknown> | null;
  open(method: string, url: string, async: boolean): void;
  send(body?: string | null): void;
  abort(): void;
}
export type WebSocketProviderType = new (url: string) => WebSocketLike;
export type XHRProviderType$2 = new () => LongPollRequestLike;
type ConnectionTransport = 'ws' | 'lp';
type ConnectionLogger = (...args: unknown[]) => void;
interface ConnectionConfig {
  host: string;
  apiKey: string;
  transport: string;
  secure?: boolean;
}
export type AutoreconnectIterationCallback = (
  timeout: number,
  promise?: Promise<void>
) => void;
declare class Connection {
  #private;
  static readonly NETWORK_ERROR = 503;
  static readonly NETWORK_ERROR_TEXT = 'Connection failed';
  static readonly NETWORK_USER = 418;
  static readonly NETWORK_USER_TEXT = 'Disconnected by client';
  host: string;
  secure: boolean | undefined;
  apiKey: string;
  version: string;
  autoreconnect: boolean;
  initialized: ConnectionTransport | undefined;
  onMessage: ((message: string) => void) | undefined;
  onDisconnect: ((err: CommError, code: number) => void) | undefined;
  onOpen: (() => void) | undefined;
  onAutoreconnectIteration: AutoreconnectIterationCallback | undefined;
  connect: (host_?: string | null, force?: boolean) => Promise<void>;
  reconnect: (force?: boolean) => void;
  disconnect: () => void;
  sendText: (msg: string) => void;
  isConnected: () => boolean;
  constructor(
    config: ConnectionConfig,
    version_: string,
    autoreconnect_: boolean
  );
  static setNetworkProviders(
    wsProvider?: WebSocketProviderType,
    xhrProvider?: XHRProviderType$2
  ): void;
  static set logger(l: ConnectionLogger);
  transport(): ConnectionTransport | undefined;
  probe(): void;
  backoffReset(): void;
  retryNow(): void;
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

type Handler<E> = {
  bivarianceHack(evt: E): void;
}['bivarianceHack'];
interface UploadProgressEventLike {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}
interface XHRLike {
  readyState: number;
  status: number;
  statusText: string;
  response: unknown;
  responseType: string;
  upload: {
    onprogress: Handler<UploadProgressEventLike> | null;
  };
  onload: Handler<unknown> | null;
  onerror: Handler<unknown> | null;
  onabort: Handler<unknown> | null;
  onprogress: Handler<{
    loaded: number;
  }> | null;
  open(method: string, url: string, async: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: FormData | null): void;
  abort(): void;
}
export type XHRProviderType$1 = new () => XHRLike;
type LargeFileTinode = Pick<
  Tinode,
  | '_apiKey'
  | '_secure'
  | '_host'
  | 'getAuthToken'
  | 'getNextUniqueId'
  | 'logger'
>;
export interface ReactNativeFileDescriptor {
  uri: string;
  name: string;
  type: string;
}
export type UploadData = Blob | ReactNativeFileDescriptor;
interface ServerCtrl {
  code: number;
  text: string;
  params?: Record<string, unknown>;
}
type ProgressCallback = (progress: number) => void;
type SuccessCallback = (ctrl: ServerCtrl) => void;
type FailureCallback = (ctrl: ServerCtrl | null) => void;
type DownloadErrorCallback = (err: unknown) => void;
export declare class LargeFileHelper {
  _tinode: LargeFileTinode;
  _version: string;
  _apiKey: string;
  _authToken: ReturnType<Tinode['getAuthToken']>;
  xhr: XHRLike[];
  onProgress: ProgressCallback | undefined;
  constructor(tinode: LargeFileTinode, version: string);
  uploadWithBaseUrl(
    baseUrl: string | null | undefined,
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string>;
  upload(
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string>;
  download(
    relativeUrl: string,
    filename?: string,
    mimetype?: string,
    onProgress?: ProgressCallback | null,
    onError?: DownloadErrorCallback | null
  ): Promise<Blob | void> | undefined;
  cancel(): void;
  static setNetworkProvider(xhrProvider?: XHRProviderType$1): void;
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

export interface NetInfoStateLike {
  isConnected: boolean | null;
}
export interface NetInfoLike {
  addEventListener(listener: (state: NetInfoStateLike) => void): () => void;
}

export type XHRProviderType = XHRProviderType$2 & XHRProviderType$1;
export interface TinodeNetwork {
  WebSocket?: WebSocketProviderType;
  XMLHttpRequest?: XHRProviderType;
}
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

export declare class MemoryAdapter implements StorageAdapter {
  #private;
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
    ranges: SeqRange$1[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange$1[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

interface IdbRequest<T> {
  result: T;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}
interface IdbOpenRequest extends IdbRequest<IdbDatabase> {
  onupgradeneeded: (() => void) | null;
  onblocked: (() => void) | null;
}
interface IdbCursor<T> {
  value: T;
  continue(): void;
}
interface IdbIndex {
  openCursor(
    range: unknown,
    direction: 'prev'
  ): IdbRequest<IdbCursor<{
    clear: number;
  }> | null>;
}
interface IdbObjectStore {
  indexNames: {
    contains(name: string): boolean;
  };
  get(key: unknown): IdbRequest<unknown>;
  getAll(range?: unknown): IdbRequest<unknown[]>;
  put(value: object): IdbRequest<unknown>;
  delete(key: unknown): IdbRequest<unknown>;
  openCursor(
    range: unknown,
    direction: 'prev'
  ): IdbRequest<IdbCursor<unknown> | null>;
  index(name: string): IdbIndex;
  createIndex(
    name: string,
    keyPath: string[],
    options: {
      unique: boolean;
    }
  ): unknown;
}
interface IdbTransaction {
  error: unknown;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  objectStore(name: string): IdbObjectStore;
}
interface IdbDatabase {
  objectStoreNames: {
    contains(name: string): boolean;
  };
  onversionchange: (() => void) | null;
  transaction(stores: string[], mode?: 'readwrite'): IdbTransaction;
  createObjectStore(
    name: string,
    options: {
      keyPath: string | string[];
    }
  ): IdbObjectStore;
  close(): void;
}
interface IdbFactory {
  open(name: string, version: number): IdbOpenRequest;
  deleteDatabase(name: string): IdbRequest<unknown> & {
    onblocked: (() => void) | null;
  };
}
interface IdbKeyRangeStatic {
  only(value: unknown): unknown;
  bound(
    lower: unknown,
    upper: unknown,
    lowerOpen?: boolean,
    upperOpen?: boolean
  ): unknown;
}
interface IndexedDBProvider {
  factory: IdbFactory;
  keyRange: IdbKeyRangeStatic;
}
export declare class IndexedDBAdapter implements StorageAdapter {
  #private;
  constructor(provider?: IndexedDBProvider);
  static isSupported(): boolean;
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
    ranges: SeqRange$1[]
  ): Promise<MessageRecord[]>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
  readDelLog(topic: string, window: SeqWindow): Promise<DelLogRange[]>;
  readDelLogRanges(topic: string, ranges: SeqRange$1[]): Promise<DelLogRange[]>;
  maxDelId(topic: string): Promise<number>;
}

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
  (
    | {
        remove(key: string): unknown;
      }
    | {
        delete(key: string): unknown;
      }
  );
export interface KeyValueAdapterOptions {
  prefix?: string;
}
export declare class KeyValueAdapter extends MemoryAdapter {
  #private;
  constructor(store: KeyValueStore, options?: KeyValueAdapterOptions);
  open(): Promise<void>;
  destroy(): Promise<void>;
  putTopic(record: TopicRecord): Promise<void>;
  removeTopic(name: string): Promise<void>;
  putUser(record: UserRecord): Promise<void>;
  removeUser(uid: string): Promise<void>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(topic: string, uid: string): Promise<void>;
  putMessage(record: MessageRecord): Promise<void>;
  updateMessageStatus(
    topic: string,
    seq: number,
    status: number
  ): Promise<void>;
  removeMessages(topic: string, low: number, hi: number): Promise<void>;
  addDelLog(records: DelLogRecord[]): Promise<void>;
}
