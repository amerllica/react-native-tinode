import AccessMode from './access-mode';
import type { AccessModeInput } from './access-mode';
import CBuffer from './cbuffer';
import CommError from './comm-error';
import * as Const from './config';
import Drafty from './drafty';
import type { DraftyDoc } from './drafty';
import MetaGetBuilder from './meta-builder';
import type { GetDataType, GetQuery } from './meta-builder';
import type PersistentCache from './storage/persistent-cache';
import type { MessageRecord } from './storage/storage-adapter';
import type { Tinode } from './tinode';
import type {
  Credential,
  CtrlMessage,
  DefAcs,
  InfoMessage,
  LastSeen,
  Message,
  MessageHead,
  MetaMessage,
  PresMessage,
  PubMessage,
  SetParams,
  TopicDesc,
  TopicPrivate,
  TopicSubscription,
  TopicType,
} from './types';
import {
  listToRanges,
  mergeObj,
  mergeToCache,
  normalizeArray,
  normalizeRanges,
} from './utils';
import type { SeqRange } from './utils';

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

export type ReceiptKind = 'recv' | 'read';

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

const TOPIC_TYPES: Record<string, TopicType> = {
  me: Const.TOPIC_ME,
  fnd: Const.TOPIC_FND,
  grp: Const.TOPIC_GRP,
  new: Const.TOPIC_GRP,
  nch: Const.TOPIC_GRP,
  chn: Const.TOPIC_GRP,
  usr: Const.TOPIC_P2P,
  sys: Const.TOPIC_SYS,
  slf: Const.TOPIC_SLF,
};

function bySeq(a: Message, b: Message): number {
  return a.seq - b.seq;
}

function isMessageHead(head: unknown): head is MessageHead {
  return typeof head === 'object' && head !== null && !Array.isArray(head);
}

function isMessageContent(content: unknown): content is DraftyDoc | string {
  return (
    typeof content === 'string' ||
    (typeof content === 'object' && content !== null)
  );
}

function messageFromRecord(rec: MessageRecord): Message {
  const { head, content, ...rest } = rec;
  return {
    ...rest,
    head: isMessageHead(head) ? head : undefined,
    content: isMessageContent(content) ? content : undefined,
  };
}

export default class Topic {
  #tinode: Tinode | null = null;

  name: string;
  created: Date | undefined = undefined;
  updated: Date | undefined = undefined;
  touched: Date = new Date(0);
  deleted: Date | undefined = undefined;
  acs: AccessMode = new AccessMode(null);
  defacs: DefAcs | undefined = undefined;
  private: TopicPrivate | null = null;
  public: unknown = null;
  trusted: unknown = null;

  seq = 0;
  read = 0;
  recv = 0;
  unread = 0;
  clear = 0;
  subcnt = 0;
  online: boolean | undefined = undefined;
  seen: LastSeen | undefined = undefined;
  topic: string | undefined = undefined;

  _users: Record<string, TopicSubscription> = {};
  _queuedSeqId: number = Const.LOCAL_SEQID;
  _maxSeq = 0;
  _minSeq = 0;
  _noEarlierMsgs = false;
  _maxDel = 0;
  _recvNotificationTimer: ReturnType<typeof setTimeout> | null = null;
  _tags: string[] = [];
  _credentials: Credential[] = [];
  _aux: Record<string, unknown> = {};
  _messageVersions: Record<number, CBuffer<Message>> = {};
  _messages: CBuffer<Message> = new CBuffer<Message>(bySeq, true);
  _attached = false;
  _lastSubsUpdate: Date = new Date(0);
  _new?: boolean = true;
  _deleted = false;
  _delayedLeaveTimer: ReturnType<typeof setTimeout> | null = null;

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

  _cacheGetUser: (uid: string) => TopicSubscription | undefined = () =>
    undefined;
  _cachePutUser: (uid: string, user: TopicSubscription) => void = () => {};
  _cacheDelUser: (uid: string) => void = () => {};
  _cachePutSelf: () => void = () => {};
  _cacheDelSelf: () => void = () => {};

  constructor(name: string, callbacks?: TopicCallbacks) {
    this.name = name;
    this.onData = callbacks?.onData;
    this.onMeta = callbacks?.onMeta;
    this.onPres = callbacks?.onPres;
    this.onInfo = callbacks?.onInfo;
    this.onMetaDesc = callbacks?.onMetaDesc;
    this.onMetaSub = callbacks?.onMetaSub;
    this.onSubsUpdated = callbacks?.onSubsUpdated;
    this.onTagsUpdated = callbacks?.onTagsUpdated;
    this.onCredsUpdated = callbacks?.onCredsUpdated;
    this.onAuxUpdated = callbacks?.onAuxUpdated;
    this.onDeleteTopic = callbacks?.onDeleteTopic;
    this.onAllMessagesReceived = callbacks?.onAllMessagesReceived;
  }

  get _tinode(): Tinode {
    if (!this.#tinode) {
      throw new Error(`Topic '${this.name}' is not attached to Tinode`);
    }
    return this.#tinode;
  }

  set _tinode(tinode: Tinode) {
    this.#tinode = tinode;
  }

  static topicType(name: string | null | undefined): TopicType | undefined {
    return TOPIC_TYPES[typeof name === 'string' ? name.substring(0, 3) : 'xxx'];
  }

  static isMeTopicName(name: string | null | undefined): boolean {
    return Topic.topicType(name) === Const.TOPIC_ME;
  }

  static isSelfTopicName(name: string | null | undefined): boolean {
    return Topic.topicType(name) === Const.TOPIC_SLF;
  }

  static isGroupTopicName(name: string | null | undefined): boolean {
    return Topic.topicType(name) === Const.TOPIC_GRP;
  }

  static isP2PTopicName(name: string | null | undefined): boolean {
    return Topic.topicType(name) === Const.TOPIC_P2P;
  }

  static isCommTopicName(name: string | null | undefined): boolean {
    return (
      Topic.isP2PTopicName(name) ||
      Topic.isGroupTopicName(name) ||
      Topic.isSelfTopicName(name)
    );
  }

  static isNewGroupTopicName(name: string | null | undefined): boolean {
    if (typeof name !== 'string') {
      return false;
    }
    const prefix = name.substring(0, 3);
    return prefix === Const.TOPIC_NEW || prefix === Const.TOPIC_NEW_CHAN;
  }

  static isChannelTopicName(name: string | null | undefined): boolean {
    if (typeof name !== 'string') {
      return false;
    }
    const prefix = name.substring(0, 3);
    return prefix === Const.TOPIC_CHAN || prefix === Const.TOPIC_NEW_CHAN;
  }

  static #isReplacementMsg(pub: Message): boolean {
    return !!pub.head?.replace;
  }

  isSubscribed(): boolean {
    return this._attached;
  }

  subscribe(
    getParams?: GetQuery,
    setParams?: SetParams
  ): Promise<CtrlMessage | Topic> {
    if (this._delayedLeaveTimer) {
      clearTimeout(this._delayedLeaveTimer);
    }
    this._delayedLeaveTimer = null;

    if (this._attached) {
      return Promise.resolve(this);
    }

    return this._tinode
      .subscribe(this.name || Const.TOPIC_NEW, getParams, setParams)
      .then((ctrl) => {
        if (ctrl.code >= 300) {
          return ctrl;
        }

        this._attached = true;
        this._deleted = false;
        this.acs = ctrl.params?.acs ?? this.acs;

        if (this._new) {
          delete this._new;

          if (ctrl.topic && this.name !== ctrl.topic) {
            this._cacheDelSelf();
            this.name = ctrl.topic;
          }
          this._cachePutSelf();

          this.created = ctrl.ts;
          this.updated = ctrl.ts;

          if (this.name !== Const.TOPIC_ME && this.name !== Const.TOPIC_FND) {
            const me = this._tinode.getMeTopic();
            if (me.onMetaSub) {
              me.onMetaSub(this);
            }
            if (me.onSubsUpdated) {
              me.onSubsUpdated([this.name], 1);
            }
          }

          if (setParams?.desc) {
            setParams.desc._noForwarding = true;
            this._processMetaDesc(setParams.desc);
          }
        }
        return ctrl;
      });
  }

  createMessage(data: DraftyDoc | string, noEcho?: boolean): PubMessage {
    return this._tinode.createMessage(this.name, data, noEcho);
  }

  publish(
    data: DraftyDoc | string,
    noEcho?: boolean
  ): Promise<CtrlMessage | undefined> {
    return this.publishMessage(this.createMessage(data, noEcho));
  }

  publishMessage(pub: PubMessage): Promise<CtrlMessage | undefined> {
    if (!this._attached) {
      return Promise.reject(new Error('Cannot publish on inactive topic'));
    }
    if (pub._sending) {
      return Promise.reject(new Error('The message is already being sent'));
    }

    pub._sending = true;
    pub._failed = false;

    let attachments: string[] | null = null;
    const content = pub.content;
    if (typeof content === 'object' && Drafty.hasEntities(content)) {
      const refs: string[] = [];
      Drafty.entities(content, (data) => {
        if (data) {
          if (data.ref) {
            refs.push(data.ref);
          }
          if (data.preref) {
            refs.push(data.preref);
          }
        }
      });
      if (refs.length > 0) {
        attachments = refs;
      }
    }

    return this._tinode
      .publishMessage(pub, attachments)
      .then((ctrl) => {
        const newSeq = ctrl.params?.seq ?? 0;
        pub._sending = false;
        pub.ts = ctrl.ts;
        const msg = Object.assign(pub, { seq: pub.seq ?? newSeq });
        this.swapMessageId(msg, newSeq);
        this._maybeUpdateMessageVersionsCache(msg);
        this._routeData(msg);
        return ctrl;
      })
      .catch((err: unknown) => {
        this._tinode.logger('WARNING: Message rejected by the server', err);
        pub._sending = false;
        pub._failed = true;
        if (this.onData) {
          this.onData();
        }
        return undefined;
      });
  }

  publishDraft(
    pub: PubMessage,
    prom?: Promise<unknown> | null
  ): Promise<CtrlMessage | undefined> {
    const seq = pub.seq || this._getQueuedSeqId();
    if (!pub._noForwarding) {
      pub._noForwarding = true;
      const msg = Object.assign(pub, {
        seq,
        ts: new Date(),
        from: this._tinode.getCurrentUserID() ?? undefined,
        noecho: true,
      });
      this._messages.put(msg);
      this._tinode._db.addMessage(msg);

      if (this.onData) {
        this.onData(msg);
      }
    }

    return (prom || Promise.resolve())
      .then(() => {
        if (pub._cancelled) {
          return {
            code: 300,
            text: 'cancelled',
          };
        }
        return this.publishMessage(pub);
      })
      .catch((err: unknown) => {
        this._tinode.logger('WARNING: Message draft rejected', err);
        pub._sending = false;
        pub._failed = true;
        pub._fatal =
          err instanceof CommError ? err.code >= 400 && err.code < 500 : false;
        if (this.onData) {
          this.onData();
        }
        throw err;
      });
  }

  leave(unsub?: boolean): Promise<CtrlMessage> {
    if (!this._attached && !unsub) {
      return Promise.reject(new Error('Cannot leave inactive topic'));
    }

    return this._tinode.leave(this.name, unsub).then((ctrl) => {
      this._resetSub();
      if (unsub) {
        this._gone();
      }
      return ctrl;
    });
  }

  leaveDelayed(unsub: boolean, delay: number): void {
    if (this._delayedLeaveTimer) {
      clearTimeout(this._delayedLeaveTimer);
    }
    this._delayedLeaveTimer = setTimeout(() => {
      this._delayedLeaveTimer = null;
      this.leave(unsub).catch((err: unknown) => {
        this._tinode.logger('WARNING: Delayed leave failed', err);
      });
    }, delay);
  }

  getMeta(params?: GetQuery): Promise<CtrlMessage | MetaMessage> {
    return this._tinode.getMeta(this.name, params);
  }

  getMessagesPage(
    limit: number,
    gaps: SeqRange[] | null | undefined,
    min: number,
    max: number,
    newer: boolean
  ): Promise<CtrlMessage | MetaMessage> {
    let query = gaps
      ? this.startMetaQuery().withDataRanges(gaps, limit)
      : newer
        ? this.startMetaQuery().withData(min, undefined, limit)
        : this.startMetaQuery().withData(undefined, max, limit);

    return this._loadMessages(this._tinode._db, query.extract('data')).then(
      (count) => {
        const missing = this.msgHasMoreMessages(min, max, newer);
        if (missing.length === 0) {
          return {
            topic: this.name,
            code: 200,
            params: {
              count: count,
            },
          };
        }

        query = this.startMetaQuery().withDataRanges(missing, limit - count);
        return this.getMeta(query.build());
      }
    );
  }

  getPinnedMessages(): Promise<number | CtrlMessage | MetaMessage> {
    const pins = this.aux('pins');
    if (!Array.isArray(pins)) {
      return Promise.resolve(0);
    }
    const pinned = pins.filter((seq): seq is number => typeof seq === 'number');

    const loaded: number[] = [];
    let remains = pinned;
    const db = this._tinode._db;
    return db
      .readMessages(this.name, { ranges: listToRanges([...remains]) })
      .then((msgs) => {
        msgs.forEach((rec) => {
          if (rec) {
            const data = messageFromRecord(rec);
            loaded.push(data.seq);
            this._messages.put(data);
            this._maybeUpdateMessageVersionsCache(data);
          }
        });
        if (loaded.length < pinned.length) {
          remains = pinned.filter((seq) => !loaded.includes(seq));
          return db.readDelLog(this.name, {
            ranges: listToRanges([...remains]),
          });
        }
        return null;
      })
      .then((ranges) => {
        if (ranges) {
          remains.forEach((seq) => {
            if (ranges.find((r) => r.low <= seq && r.hi > seq)) {
              loaded.push(seq);
            }
          });
        }
        if (loaded.length === pinned.length) {
          return {
            topic: this.name,
            code: 200,
            params: {
              count: loaded.length,
            },
          };
        }

        remains = pinned.filter((seq) => !loaded.includes(seq));
        return this.getMeta(
          this.startMetaQuery().withDataList(remains).build()
        );
      });
  }

  setMeta(params: SetParams): Promise<CtrlMessage> {
    if (params.tags) {
      params.tags = normalizeArray(params.tags);
    }
    return this._tinode.setMeta(this.name, params).then((ctrl) => {
      if (ctrl && ctrl.code >= 300) {
        return ctrl;
      }

      if (params.sub) {
        params.sub.topic = this.name;
        if (ctrl.params?.acs) {
          params.sub.acs = ctrl.params.acs;
          params.sub.updated = ctrl.ts;
        }
        if (!params.sub.user) {
          params.sub.user = this._tinode.getCurrentUserID();
          if (!params.desc) {
            params.desc = {};
          }
        }
        params.sub._noForwarding = true;
        const { user, mode, ...rest } = params.sub;
        this._processMetaSubs([
          { ...rest, user: user ?? undefined, mode: mode ?? undefined },
        ]);
      }

      if (params.desc) {
        if (ctrl.params?.acs) {
          params.desc.acs = ctrl.params.acs;
          params.desc.updated = ctrl.ts;
        }
        this._processMetaDesc(params.desc);
      }

      if (params.tags) {
        this._processMetaTags(params.tags);
      }
      if (params.cred) {
        this._processMetaCreds([params.cred], true);
      }
      if (params.aux) {
        this._processMetaAux(params.aux);
      }

      return ctrl;
    });
  }

  updateMode(uid: string | null, update: string): Promise<CtrlMessage> {
    const user = uid ? this.subscriber(uid) : undefined;
    const am = user?.acs
      ? user.acs.updateGiven(update).getGiven()
      : this.getAccessMode().updateWant(update).getWant();

    return this.setMeta({
      sub: {
        user: uid,
        mode: am,
      },
    });
  }

  invite(uid: string, mode?: string | null): Promise<CtrlMessage> {
    return this.setMeta({
      sub: {
        user: uid,
        mode: mode,
      },
    });
  }

  archive(arch: boolean): Promise<CtrlMessage | boolean> {
    if (this.private && !this.private.arch === !arch) {
      return Promise.resolve(arch);
    }
    return this.setMeta({
      desc: {
        private: {
          arch: arch ? true : Const.DEL_CHAR,
        },
      },
    });
  }

  pinMessage(seq: number, pin: boolean): Promise<CtrlMessage | void> {
    const current = this.aux('pins');
    let pinned: number[] = Array.isArray(current)
      ? current.filter((id): id is number => typeof id === 'number')
      : [];
    let changed = false;
    if (pin) {
      if (!pinned.includes(seq)) {
        changed = true;
        if (pinned.length === Const.MAX_PINNED_COUNT) {
          pinned.shift();
        }
        pinned.push(seq);
      }
    } else if (pinned.includes(seq)) {
      changed = true;
      pinned = pinned.filter((id) => id !== seq);
    }
    if (changed) {
      return this.setMeta({
        aux: {
          pins: pinned.length > 0 ? pinned : Const.DEL_CHAR,
        },
      });
    }
    return Promise.resolve();
  }

  pinTopic(_topic: string, _pin?: boolean): Promise<CtrlMessage | string[]> {
    return Promise.reject(new Error('Pinning topics is not supported here'));
  }

  pinnedTopicRank(_topic: string): number {
    return 0;
  }

  delMessages(ranges: SeqRange[], hard?: boolean): Promise<CtrlMessage> {
    if (!this._attached) {
      return Promise.reject(
        new Error('Cannot delete messages in inactive topic')
      );
    }

    const tosend = normalizeRanges(ranges, this._maxSeq);

    const result: Promise<CtrlMessage> =
      tosend.length > 0
        ? this._tinode.delMessages(this.name, tosend, hard)
        : Promise.resolve({
            code: 200,
            params: {
              del: 0,
            },
          });

    return result.then((ctrl) => {
      const del = ctrl.params?.del ?? 0;
      if (del > this._maxDel) {
        this._maxDel = Math.max(del, this._maxDel);
        this.clear = Math.max(del, this.clear);
      }

      ranges.forEach((rec) => {
        if (rec.hi) {
          this.flushMessageRange(rec.low, rec.hi);
        } else {
          this.flushMessage(rec.low);
        }
        this._messages.put({
          topic: this.name,
          seq: rec.low,
          low: rec.low,
          hi: rec.hi,
          _deleted: true,
        });
      });

      this._tinode._db.addDelLog(this.name, del, ranges);

      if (this.onData) {
        this.onData();
      }
      return ctrl;
    });
  }

  delMessagesAll(hardDel?: boolean): Promise<CtrlMessage | void> {
    if (!this._maxSeq || this._maxSeq <= 0) {
      return Promise.resolve();
    }
    return this.delMessages(
      [
        {
          low: 1,
          hi: this._maxSeq + 1,
        },
      ],
      hardDel
    );
  }

  delMessagesList(list: number[], hardDel?: boolean): Promise<CtrlMessage> {
    return this.delMessages(listToRanges(list), hardDel);
  }

  delMessagesEdits(seq: number, hardDel?: boolean): Promise<CtrlMessage> {
    const list = [seq];
    this.messageVersions(seq, (msg) => list.push(msg.seq));
    return this.delMessagesList(list, hardDel);
  }

  delTopic(hard?: boolean): Promise<CtrlMessage | null> {
    if (this._deleted) {
      this._gone();
      return Promise.resolve(null);
    }

    return this._tinode.delTopic(this.name, hard).then((ctrl) => {
      this._deleted = true;
      this._resetSub();
      this._gone();
      return ctrl;
    });
  }

  delSubscription(user: string): Promise<CtrlMessage> {
    if (!this._attached) {
      return Promise.reject(
        new Error('Cannot delete subscription in inactive topic')
      );
    }
    return this._tinode.delSubscription(this.name, user).then((ctrl) => {
      delete this._users[user];
      if (this.onSubsUpdated) {
        this.onSubsUpdated(Object.keys(this._users));
      }
      return ctrl;
    });
  }

  note(what: ReceiptKind, seq: number): void {
    if (!this._attached) {
      return;
    }

    const myUID = this._tinode.getCurrentUserID();
    const user = myUID ? this._users[myUID] : undefined;
    let update = false;
    if (user) {
      const current = user[what];
      if (!current || current < seq) {
        user[what] = seq;
        update = true;
      }
    } else {
      update = (this[what] | 0) < seq;
    }

    if (update) {
      this._tinode.note(this.name, what, seq);
      this._updateMyReadRecv(what, seq);

      if (this.acs != null && !this.acs.isMuted()) {
        this._tinode.getMeTopic()._refreshContact(what, this);
      }
    }
  }

  noteRecv(seq: number): void {
    this.note('recv', seq);
  }

  noteRead(seq?: number): void {
    const target = seq || this._maxSeq;
    if (target > 0) {
      this.note('read', target);
    }
  }

  noteKeyPress(): void {
    if (this._attached) {
      this._tinode.noteKeyPress(this.name);
    } else {
      this._tinode.logger('INFO: Cannot send notification in inactive topic');
    }
  }

  noteRecording(audioOnly?: boolean): void {
    if (this._attached) {
      this._tinode.noteKeyPress(this.name, audioOnly ? 'kpa' : 'kpv');
    } else {
      this._tinode.logger('INFO: Cannot send notification in inactive topic');
    }
  }

  videoCall(evt: string, seq: number, payload?: unknown): void {
    if (!this._attached && !['ringing', 'hang-up'].includes(evt)) {
      return;
    }
    this._tinode.videoCall(this.name, seq, evt, payload);
  }

  _updateMyReadRecv(
    what: ReceiptKind | 'msg',
    seq?: number,
    ts?: Date
  ): boolean {
    let oldVal: number;
    let doUpdate = false;

    const value = (seq ?? 0) | 0;
    this.seq = this.seq | 0;
    this.read = this.read | 0;
    this.recv = this.recv | 0;
    switch (what) {
      case 'recv':
        oldVal = this.recv;
        this.recv = Math.max(this.recv, value);
        doUpdate = oldVal !== this.recv;
        break;
      case 'read':
        oldVal = this.read;
        this.read = Math.max(this.read, value);
        doUpdate = oldVal !== this.read;
        break;
      case 'msg':
        oldVal = this.seq;
        this.seq = Math.max(this.seq, value);
        if (ts && (!this.touched || this.touched < ts)) {
          this.touched = ts;
        }
        doUpdate = oldVal !== this.seq;
        break;
    }

    if (this.recv < this.read) {
      this.recv = this.read;
      doUpdate = true;
    }
    if (this.seq < this.recv) {
      this.seq = this.recv;
      if (ts && (!this.touched || this.touched < ts)) {
        this.touched = ts;
      }
      doUpdate = true;
    }
    this.unread = this.seq - this.read;
    return doUpdate;
  }

  userDesc(uid: string): TopicSubscription | undefined {
    return this._cacheGetUser(uid);
  }

  p2pPeerDesc(): TopicSubscription | undefined {
    if (!this.isP2PType()) {
      return undefined;
    }
    return this._users[this.name];
  }

  subscribers(callback?: SubscriberCallback, context?: unknown): void {
    const cb = callback || this.onMetaSub;
    if (cb) {
      for (const idx in this._users) {
        const user = this._users[idx];
        if (user) {
          cb.call(context, user, idx, this._users);
        }
      }
    }
  }

  tags(): string[] {
    return this._tags.slice(0);
  }

  aux(key: string): unknown {
    return this._aux[key];
  }

  alias(): string | undefined {
    const alias = this._tags?.find((t) => t.startsWith(Const.TAG_ALIAS));
    if (!alias) {
      return undefined;
    }
    return alias.substring(Const.TAG_ALIAS.length);
  }

  subscriber(uid: string): TopicSubscription | undefined {
    return this._users[uid];
  }

  messageVersions(
    origSeq: number,
    callback?: MessageCallback,
    context?: unknown
  ): void {
    if (!callback) {
      return;
    }
    const versions = this._messageVersions[origSeq];
    if (!versions) {
      return;
    }
    versions.forEach(callback, undefined, undefined, context);
  }

  messages(
    callback?: MessageCallback,
    sinceId?: number,
    beforeId?: number,
    context?: unknown
  ): void {
    const cb = callback || this.onData;
    if (!cb) {
      return;
    }
    const startIdx =
      typeof sinceId === 'number'
        ? this._messages.find(this.#seqProbe(sinceId), true)
        : undefined;
    const beforeIdx =
      typeof beforeId === 'number'
        ? this._messages.find(this.#seqProbe(beforeId), true)
        : undefined;
    if (startIdx === -1 || beforeIdx === -1) {
      return;
    }

    const msgs: { data: Message; idx: number }[] = [];
    this._messages.forEach(
      (msg, _prev, _next, i) => {
        if (Topic.#isReplacementMsg(msg)) {
          return;
        }
        if (msg._deleted) {
          return;
        }
        const latest = this.latestMsgVersion(msg.seq) || msg;
        if (!latest._origTs) {
          latest._origTs = latest.ts;
          latest._origSeq = latest.seq;
          latest.ts = msg.ts;
          latest.seq = msg.seq;
        }
        msgs.push({
          data: latest,
          idx: i,
        });
      },
      startIdx,
      beforeIdx,
      {}
    );

    msgs.forEach((val, i) => {
      cb.call(context, val.data, msgs[i - 1]?.data, msgs[i + 1]?.data, val.idx);
    });
  }

  findMessage(seq: number): Message | undefined {
    const idx = this._messages.find(this.#seqProbe(seq));
    if (idx >= 0) {
      return this._messages.getAt(idx);
    }
    return undefined;
  }

  latestMessage(): Message | undefined {
    return this._messages.getLast((msg) => !msg._deleted);
  }

  latestMsgVersion(seq: number): Message | null {
    const versions = this._messageVersions[seq];
    return versions?.getLast() ?? null;
  }

  maxMsgSeq(): number {
    return this._maxSeq;
  }

  minMsgSeq(): number {
    return this._minSeq;
  }

  maxClearId(): number {
    return this._maxDel;
  }

  messageCount(): number {
    return this._messages.length();
  }

  queuedMessages(callback: MessageCallback, context?: unknown): void {
    if (!callback) {
      throw new Error('Callback must be provided');
    }
    this.messages(callback, Const.LOCAL_SEQID, undefined, context);
  }

  msgReceiptCount(what: ReceiptKind, seq: number): number {
    let count = 0;
    if (seq > 0) {
      const me = this._tinode.getCurrentUserID();
      for (const idx in this._users) {
        const user = this._users[idx];
        const value = user?.[what];
        if (user && user.user !== me && value !== undefined && value >= seq) {
          count++;
        }
      }
    }
    return count;
  }

  msgReadCount(seq: number): number {
    return this.msgReceiptCount('read', seq);
  }

  msgRecvCount(seq: number): number {
    return this.msgReceiptCount('recv', seq);
  }

  msgHasMoreMessages(min: number, max: number, newer: boolean): SeqRange[] {
    const gaps: SeqRange[] = [];
    if (min >= max) {
      return gaps;
    }
    let maxSeq = 0;
    this._messages.forEach((msg, prev) => {
      const expected = prev
        ? prev._deleted
          ? (prev.hi ?? prev.seq + 1)
          : prev.seq + 1
        : 1;
      if (msg.seq > expected) {
        const gap = { low: expected, hi: msg.seq };
        if (newer ? gap.hi >= min : gap.low < max) {
          gaps.push(gap);
        }
      }
      maxSeq = expected;
    });

    if (maxSeq < this.seq) {
      const gap = { low: maxSeq + 1, hi: this.seq + 1 };
      if (newer ? gap.hi >= min : gap.low < max) {
        gaps.push(gap);
      }
    }
    return gaps;
  }

  isNewMessage(seqId: number): boolean {
    return this._maxSeq <= seqId;
  }

  flushMessage(seqId: number): Message | undefined {
    const idx = this._messages.find(this.#seqProbe(seqId));
    delete this._messageVersions[seqId];
    if (idx >= 0) {
      this._tinode._db.remMessages(this.name, seqId);
      return this._messages.delAt(idx);
    }
    return undefined;
  }

  flushMessageRange(fromId: number, untilId: number): Message[] {
    this._tinode._db.remMessages(this.name, fromId, untilId);

    for (let i = fromId; i < untilId; i++) {
      delete this._messageVersions[i];
    }

    const since = this._messages.find(this.#seqProbe(fromId), true);
    return since >= 0
      ? this._messages.delRange(
          since,
          this._messages.find(this.#seqProbe(untilId), true)
        )
      : [];
  }

  swapMessageId(pub: Message, newSeqId: number): void {
    const idx = this._messages.find(pub);
    const numMessages = this._messages.length();
    if (idx >= 0 && idx < numMessages) {
      this._messages.delAt(idx);
      this._tinode._db.remMessages(this.name, pub.seq);
      pub.seq = newSeqId;
      this._messages.put(pub);
      this._tinode._db.addMessage(pub);
    }
  }

  cancelSend(seqId: number): boolean {
    const idx = this._messages.find(this.#seqProbe(seqId));
    const msg = idx >= 0 ? this._messages.getAt(idx) : undefined;
    if (msg) {
      const status = this.msgStatus(msg);
      if (
        status === Const.MESSAGE_STATUS_QUEUED ||
        status === Const.MESSAGE_STATUS_FAILED ||
        status === Const.MESSAGE_STATUS_FATAL
      ) {
        this._tinode._db.remMessages(this.name, seqId);
        msg._cancelled = true;
        this._messages.delAt(idx);
        if (this.onData) {
          this.onData();
        }
        return true;
      }
    }
    return false;
  }

  getType(): TopicType | undefined {
    return Topic.topicType(this.name);
  }

  getAccessMode(): AccessMode {
    return this.acs;
  }

  setAccessMode(acs?: AccessModeInput | null): AccessMode {
    return (this.acs = new AccessMode(acs));
  }

  getDefaultAccess(): DefAcs | undefined {
    return this.defacs;
  }

  startMetaQuery(): MetaGetBuilder {
    return new MetaGetBuilder(this);
  }

  isArchived(): boolean {
    return !!this.private?.arch;
  }

  isMeType(): boolean {
    return Topic.isMeTopicName(this.name);
  }

  isSelfType(): boolean {
    return Topic.isSelfTopicName(this.name);
  }

  isChannelType(): boolean {
    return Topic.isChannelTopicName(this.name);
  }

  isGroupType(): boolean {
    return Topic.isGroupTopicName(this.name);
  }

  isP2PType(): boolean {
    return Topic.isP2PTopicName(this.name);
  }

  isCommType(): boolean {
    return Topic.isCommTopicName(this.name);
  }

  msgStatus(msg: Message, upd?: boolean): number {
    let status = Const.MESSAGE_STATUS_NONE;
    if (this._tinode.isMe(msg.from)) {
      if (msg._sending) {
        status = Const.MESSAGE_STATUS_SENDING;
      } else if (msg._fatal || msg._cancelled) {
        status = Const.MESSAGE_STATUS_FATAL;
      } else if (msg._failed) {
        status = Const.MESSAGE_STATUS_FAILED;
      } else if (msg.seq >= Const.LOCAL_SEQID) {
        status = Const.MESSAGE_STATUS_QUEUED;
      } else if (this.msgReadCount(msg.seq) > 0) {
        status = Const.MESSAGE_STATUS_READ;
      } else if (this.msgRecvCount(msg.seq) > 0) {
        status = Const.MESSAGE_STATUS_RECEIVED;
      } else if (msg.seq > 0) {
        status = Const.MESSAGE_STATUS_SENT;
      }
    } else {
      status = Const.MESSAGE_STATUS_TO_ME;
    }

    if (upd && msg._status !== status) {
      msg._status = status;
      this._tinode._db.updMessageStatus(this.name, msg.seq, status);
    }

    return status;
  }

  #seqProbe(seq: number): Message {
    return { topic: this.name, seq };
  }

  _maybeUpdateMessageVersionsCache(msg: Message): void {
    const replace = msg.head?.replace;
    if (!replace) {
      const versions = this._messageVersions[msg.seq];
      if (versions) {
        versions.filter((version) => version.from === msg.from);
        if (versions.isEmpty()) {
          delete this._messageVersions[msg.seq];
        }
      }
      return;
    }

    const targetSeq = parseInt(replace.split(':')[1] ?? '', 10);
    if (isNaN(targetSeq) || targetSeq > msg.seq) {
      return;
    }
    const targetMsg = this.findMessage(targetSeq);
    if (targetMsg && targetMsg.from !== msg.from) {
      return;
    }
    const versions =
      this._messageVersions[targetSeq] || new CBuffer<Message>(bySeq, true);
    versions.put(msg);
    this._messageVersions[targetSeq] = versions;
  }

  _routeData(data: Message): void {
    if (data.content) {
      if (data.ts && (!this.touched || this.touched < data.ts)) {
        this.touched = data.ts;
        this._tinode._db.updTopic(this);
      }
    }

    if (data.seq > this._maxSeq) {
      this._maxSeq = data.seq;
      this.msgStatus(data, true);
      if (this._recvNotificationTimer) {
        clearTimeout(this._recvNotificationTimer);
      }
      this._recvNotificationTimer = setTimeout(() => {
        this._recvNotificationTimer = null;
        this.noteRecv(this._maxSeq);
      }, Const.RECV_TIMEOUT);
    }

    if (data.seq < this._minSeq || this._minSeq === 0) {
      this._minSeq = data.seq;
    }

    const outgoing =
      (!this.isChannelType() && !data.from) || this._tinode.isMe(data.from);

    if (
      data.head?.webrtc &&
      data.head.mime === Drafty.getContentType() &&
      data.content &&
      typeof data.content === 'object'
    ) {
      data.content = Drafty.updateVideoCall(data.content, {
        state: data.head.webrtc,
        duration: data.head['webrtc-duration'],
        incoming: !outgoing,
        vc: data.head.vc ? true : undefined,
      });
    }

    if (!data._noForwarding) {
      this._messages.put(data);
      this._tinode._db.addMessage(data);
      this._maybeUpdateMessageVersionsCache(data);
    }

    if (this.onData) {
      this.onData(data);
    }

    const what = outgoing ? 'read' : 'msg';
    this._updateMyReadRecv(what, data.seq, data.ts);

    if (!outgoing && data.from) {
      this._routeInfo({
        what: 'read',
        from: data.from,
        seq: data.seq,
        _noForwarding: true,
      });
    }

    this._tinode.getMeTopic()._refreshContact(what, this);
  }

  _routeMeta(meta: MetaMessage): void {
    if (meta.desc) {
      this._processMetaDesc(meta.desc);
    }
    if (meta.sub && meta.sub.length > 0) {
      this._processMetaSubs(meta.sub, true);
    }
    if (meta.del) {
      this._processDelMessages(meta.del.clear, meta.del.delseq);
    }
    if (meta.tags) {
      this._processMetaTags(meta.tags);
    }
    if (meta.cred) {
      this._processMetaCreds(meta.cred);
    }
    if (meta.aux) {
      this._processMetaAux(meta.aux);
    }
    if (this.onMeta) {
      this.onMeta(meta);
    }
  }

  _routePres(pres: PresMessage): void {
    switch (pres.what) {
      case 'del':
        this._processDelMessages(pres.clear ?? 0, pres.delseq);
        break;
      case 'on':
      case 'off': {
        const user = pres.src ? this._users[pres.src] : undefined;
        if (user) {
          user.online = pres.what === 'on';
        } else {
          this._tinode.logger(
            'WARNING: Presence update for an unknown user',
            this.name,
            pres.src
          );
        }
        break;
      }
      case 'term':
        this._resetSub();
        break;
      case 'upd':
        if (pres.src && !this._tinode.isTopicCached(pres.src)) {
          this.getMeta(
            this.startMetaQuery().withOneSub(undefined, pres.src).build()
          );
        }
        break;
      case 'aux':
        this.getMeta(this.startMetaQuery().withAux().build());
        break;
      case 'acs': {
        const uid = pres.src || this._tinode.getCurrentUserID();
        if (!uid) {
          break;
        }
        const user = this._users[uid];
        if (!user) {
          const acs = new AccessMode().updateAll(pres.dacs);
          if (acs && acs.mode !== AccessMode._NONE) {
            let sub = this._cacheGetUser(uid);
            if (!sub) {
              sub = {
                user: uid,
                acs: acs,
              };
              this.getMeta(
                this.startMetaQuery().withOneSub(undefined, uid).build()
              );
            } else {
              sub.acs = acs;
            }
            sub.updated = new Date();
            this._processMetaSubs([sub]);
          }
        } else {
          const acs = (user.acs ?? new AccessMode()).updateAll(pres.dacs);
          this._processMetaSubs([
            {
              user: uid,
              updated: new Date(),
              acs: acs,
            },
          ]);
        }
        break;
      }
      default:
        this._tinode.logger('INFO: Ignored presence update', pres.what);
    }

    if (this.onPres) {
      this.onPres(pres);
    }
  }

  _routeInfo(info: InfoMessage): void {
    switch (info.what) {
      case 'recv':
      case 'read': {
        const user = info.from ? this._users[info.from] : undefined;
        if (user) {
          user[info.what] = info.seq;
          if ((user.recv ?? 0) < (user.read ?? 0)) {
            user.recv = user.read;
          }
        }
        const msg = this.latestMessage();
        if (msg) {
          this.msgStatus(msg, true);
        }

        if (this._tinode.isMe(info.from) && !info._noForwarding) {
          this._updateMyReadRecv(info.what, info.seq);
        }

        this._tinode.getMeTopic()._refreshContact(info.what, this);
        break;
      }
      case 'kp':
      case 'kpa':
      case 'kpv':
        break;
      case 'call':
        break;
      default:
        this._tinode.logger('INFO: Ignored info update', info.what);
    }

    if (this.onInfo) {
      this.onInfo(info);
    }
  }

  _processMetaDesc(desc: TopicDesc): void {
    if (this.isP2PType()) {
      delete desc.defacs;
      this._tinode._db.updUser(this.name, desc.public);
    }

    mergeObj(this, desc);
    this._tinode._db.updTopic(this);

    if (this.name !== Const.TOPIC_ME && !desc._noForwarding) {
      const me = this._tinode.getMeTopic();
      if (me.onMetaSub) {
        me.onMetaSub(this);
      }
      if (me.onSubsUpdated) {
        me.onSubsUpdated([this.name], 1);
      }
    }

    if (this.onMetaDesc) {
      this.onMetaDesc(this);
    }
  }

  _processMetaSubs(subs: TopicSubscription[], skipSubcnt?: boolean): void {
    for (const sub of subs) {
      sub.online = !!sub.online;
      this._lastSubsUpdate = new Date(
        Math.max(
          this._lastSubsUpdate.getTime(),
          sub.updated ? sub.updated.getTime() : 0
        )
      );

      const uid = sub.user;
      if (!uid) {
        continue;
      }

      let user: TopicSubscription;
      if (!sub.deleted) {
        if (this._tinode.isMe(uid) && sub.acs) {
          this._processMetaDesc({
            updated: sub.updated,
            touched: sub.touched,
            acs: sub.acs,
          });
        }
        if (!this._users[uid] && !skipSubcnt) {
          this.subcnt++;
        }
        user = this._updateCachedUser(uid, sub);
        this._tinode._db.updSubscription(this.name, uid, sub);
      } else {
        delete this._users[uid];
        this._tinode._db.remSubscription(this.name, uid);
        if (!skipSubcnt) {
          this.subcnt--;
        }
        user = sub;
      }

      if (this.onMetaSub) {
        this.onMetaSub(user);
      }
    }

    if (this.onSubsUpdated) {
      this.onSubsUpdated(Object.keys(this._users));
    }
  }

  _processMetaTags(tags: string[] | string): void {
    const list =
      typeof tags === 'string' ||
      (tags.length === 1 && tags[0] === Const.DEL_CHAR)
        ? []
        : tags;
    this._tags = list;
    this._tinode._db.updTopic(this);
    if (this.onTagsUpdated) {
      this.onTagsUpdated(list);
    }
  }

  _processMetaCreds(_creds: Credential[], _upd?: boolean): void {}

  _processMetaAux(aux: Record<string, unknown> | string | null): void {
    const update = aux && typeof aux === 'object' ? aux : {};
    this._aux = mergeObj(this._aux, update);
    this._tinode._db.updTopic(this);
    if (this.onAuxUpdated) {
      this.onAuxUpdated(this._aux);
    }
  }

  _processDelMessages(clear: number, delseq?: SeqRange[]): void {
    this._maxDel = Math.max(clear, this._maxDel);
    this.clear = Math.max(clear, this.clear);
    let count = 0;
    if (Array.isArray(delseq)) {
      delseq.forEach((rec) => {
        if (!rec.hi) {
          count++;
          this.flushMessage(rec.low);
        } else {
          count += rec.hi - rec.low;
          this.flushMessageRange(rec.low, rec.hi);
        }
        this._messages.put({
          topic: this.name,
          seq: rec.low,
          low: rec.low,
          hi: rec.hi,
          _deleted: true,
        });
      });

      this._tinode._db.addDelLog(this.name, clear, delseq);
    }

    if (count > 0 && this.onData) {
      this.onData();
    }
  }

  _allMessagesReceived(count: number): void {
    if (this.onAllMessagesReceived) {
      this.onAllMessagesReceived(count);
    }
  }

  _resetSub(): void {
    this._attached = false;
  }

  _gone(): void {
    this._messages.reset();
    this._tinode._db.remMessages(this.name);
    this._users = {};
    this.acs = new AccessMode(null);
    this.private = null;
    this.public = null;
    this.trusted = null;
    this._maxSeq = 0;
    this._minSeq = 0;
    this._attached = false;

    const me = this._tinode.getMeTopic();
    if (me) {
      me._routePres({
        _noForwarding: true,
        what: 'gone',
        topic: Const.TOPIC_ME,
        src: this.name,
      });
    }
    if (this.onDeleteTopic) {
      this.onDeleteTopic();
    }
  }

  _updateCachedUser(uid: string, obj: TopicSubscription): TopicSubscription {
    const cached = mergeObj<TopicSubscription>(
      this._cacheGetUser(uid) ?? {},
      obj
    );
    this._cachePutUser(uid, cached);
    return mergeToCache(this._users, uid, cached);
  }

  _getQueuedSeqId(): number {
    return this._queuedSeqId++;
  }

  _loadMessages(db: PersistentCache, query?: GetDataType): Promise<number> {
    const params = query || {};
    params.limit = params.limit || Const.DEFAULT_MESSAGES_PAGE;

    let count = 0;
    return db
      .readMessages(this.name, params)
      .then((msgs) => {
        msgs.forEach((rec) => {
          const data = messageFromRecord(rec);
          if (data.seq > this._maxSeq) {
            this._maxSeq = data.seq;
          }
          if (data.seq < this._minSeq || this._minSeq === 0) {
            this._minSeq = data.seq;
          }
          this._messages.put(data);
          this._maybeUpdateMessageVersionsCache(data);
        });
        count = msgs.length;
      })
      .then(() => db.readDelLog(this.name, params))
      .then((dellog) => {
        dellog.forEach((rec) => {
          this._messages.put({
            topic: this.name,
            seq: rec.low,
            low: rec.low,
            hi: rec.hi,
            _deleted: true,
          });
        });
        return count;
      });
  }

  _updateReceived(seq: number | undefined, act?: string): void {
    this.touched = new Date();
    this.seq = (seq ?? 0) | 0;
    if (!act || this._tinode.isMe(act)) {
      this.read = this.read ? Math.max(this.read, this.seq) : this.seq;
      this.recv = this.recv ? Math.max(this.read, this.recv) : this.read;
    }
    this.unread = this.seq - (this.read | 0);
    this._tinode._db.updTopic(this);
  }
}
