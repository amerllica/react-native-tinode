import AccessMode from './access-mode';
import CommError from './comm-error';
import * as Const from './config';
import Connection from './connection';
import type {
  AutoreconnectIterationCallback,
  WebSocketProviderType,
  XHRProviderType as ConnectionXHRProviderType,
} from './connection';
import Drafty from './drafty';
import type { DraftyDoc } from './drafty';
import TopicFnd from './fnd-topic';
import LargeFileHelper from './large-file';
import type { XHRProviderType as LargeFileXHRProviderType } from './large-file';
import TopicMe from './me-topic';
import MetaGetBuilder from './meta-builder';
import type { GetQuery } from './meta-builder';
import PersistentCache from './storage/persistent-cache';
import { resolveStorageAdapter } from './storage/resolve-adapter';
import type { StorageAdapter } from './storage/storage-adapter';
import TheCard from './the-card';
import Topic from './topic';
import type {
  AccPacket,
  AccountParams,
  AuthToken,
  ClientMessage,
  Credential,
  CtrlMessage,
  DataMessage,
  DelPacket,
  GetPacket,
  InfoMessage,
  MetaMessage,
  NotePacket,
  PresMessage,
  PubMessage,
  PushPayload,
  ServerMessage,
  ServerParams,
  SetPacket,
  SetParams,
  SubPacket,
} from './types';
import {
  isUrlRelative,
  jsonParseHelper,
  mergeObj,
  rfc3339DateString,
  simplify,
} from './utils';
import type { SeqRange } from './utils';

export { AccessMode, Drafty, TheCard };

export type XHRProviderType = ConnectionXHRProviderType &
  LargeFileXHRProviderType;

export interface TinodeConfig {
  appName?: string;
  host: string;
  apiKey: string;
  transport?: 'ws' | 'lp' | null;
  secure?: boolean;
  platform?: 'ios' | 'android' | 'web';
  persist?: boolean;
  storage?: StorageAdapter | null;
}

interface PendingPromise {
  resolve(ctrl: CtrlMessage): void;
  resolveMeta?(meta: MetaMessage): void;
  reject(err: Error): void;
  ts: Date;
}

let WebSocketProvider: WebSocketProviderType | undefined =
  typeof WebSocket !== 'undefined' ? WebSocket : undefined;
let XHRProvider: XHRProviderType | undefined =
  typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined;

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function detectTransport(): 'ws' | 'lp' | null {
  if (WebSocketProvider) {
    return 'ws';
  }
  if (XHRProvider) {
    return 'lp';
  }
  return null;
}

function base64EncodeLatin1(binary: string): string {
  let output = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += BASE64_CHARS.charAt((triple >> 18) & 63);
    output += BASE64_CHARS.charAt((triple >> 12) & 63);
    output +=
      i + 1 < binary.length ? BASE64_CHARS.charAt((triple >> 6) & 63) : '=';
    output += i + 2 < binary.length ? BASE64_CHARS.charAt(triple & 63) : '=';
  }
  return output;
}

function b64EncodeUnicode(str: string): string {
  const binary = encodeURIComponent(str).replace(
    /%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(parseInt(hex, 16))
  );
  return typeof btoa === 'function' ? btoa(binary) : base64EncodeLatin1(binary);
}

function jsonBuildHelper(_key: string, val: unknown): unknown {
  if (val instanceof Date) {
    return rfc3339DateString(val);
  }
  if (val instanceof AccessMode) {
    return val.jsonHelper();
  }
  if (
    val === undefined ||
    val === null ||
    val === false ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'object' && Object.keys(val).length === 0)
  ) {
    return undefined;
  }
  return val;
}

function jsonLoggerHelper(key: string, val: unknown): unknown {
  if (typeof val === 'string' && val.length > 128) {
    return (
      '<' +
      val.length +
      ', bytes: ' +
      val.substring(0, 12) +
      '...' +
      val.substring(val.length - 12) +
      '>'
    );
  }
  return jsonBuildHelper(key, val);
}

function navigatorField(name: string): string | undefined {
  const nav: unknown = Reflect.get(globalThis, 'navigator');
  if (typeof nav !== 'object' || nav === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(nav, name);
  return typeof value === 'string' ? value : undefined;
}

function getBrowserInfo(ua: string | undefined, product?: string): string {
  ua = ua || '';
  const reactnative = /reactnative/i.test(product || '') ? 'ReactNative; ' : '';
  let result: string;
  ua = ua.replace(' (KHTML, like Gecko)', '');
  const webkit = ua.match(/(AppleWebKit\/[.\d]+)/i);
  if (webkit) {
    const priority = ['edg', 'chrome', 'safari', 'mobile', 'version'];
    const parts = ua
      .substring((webkit.index ?? 0) + webkit[0].length)
      .split(' ');
    const tokens: [string, string, number][] = [];
    let version: string | undefined;
    for (const part of parts) {
      const m2 = /([\w.]+)[/]([.\d]+)/.exec(part);
      if (m2 && m2[1] && m2[2]) {
        const name = m2[1];
        tokens.push([
          name,
          m2[2],
          priority.findIndex((e) => name.toLowerCase().startsWith(e)),
        ]);
        if (name === 'Version') {
          version = m2[2];
        }
      }
    }
    tokens.sort((a, b) => a[2] - b[2]);
    const top = tokens[0];
    if (top) {
      if (top[0].toLowerCase().startsWith('edg')) {
        top[0] = 'Edge';
      } else if (top[0] === 'OPR') {
        top[0] = 'Opera';
      } else if (top[0] === 'Safari' && version) {
        top[1] = version;
      }
      result = top[0] + '/' + top[1];
    } else {
      result = webkit[1] ?? '';
    }
  } else if (/firefox/i.test(ua)) {
    const m = /Firefox\/([.\d]+)/g.exec(ua);
    result = m ? 'Firefox/' + m[1] : 'Firefox/?';
  } else {
    const m = /([\w.]+)\/([.\d]+)/.exec(ua);
    result = m ? m[1] + '/' + m[2] : (ua.split(' ')[0] ?? '');
  }

  const [name, ver] = result.split('/');
  if (ver !== undefined) {
    const v = ver.split('.');
    const minor = v[1] ? '.' + v[1].substring(0, 2) : '';
    result = `${name}/${v[0]}${minor}`;
  }
  return reactnative + result;
}

export class Tinode {
  static readonly MESSAGE_STATUS_NONE = Const.MESSAGE_STATUS_NONE;
  static readonly MESSAGE_STATUS_QUEUED = Const.MESSAGE_STATUS_QUEUED;
  static readonly MESSAGE_STATUS_SENDING = Const.MESSAGE_STATUS_SENDING;
  static readonly MESSAGE_STATUS_FAILED = Const.MESSAGE_STATUS_FAILED;
  static readonly MESSAGE_STATUS_FATAL = Const.MESSAGE_STATUS_FATAL;
  static readonly MESSAGE_STATUS_SENT = Const.MESSAGE_STATUS_SENT;
  static readonly MESSAGE_STATUS_RECEIVED = Const.MESSAGE_STATUS_RECEIVED;
  static readonly MESSAGE_STATUS_READ = Const.MESSAGE_STATUS_READ;
  static readonly MESSAGE_STATUS_TO_ME = Const.MESSAGE_STATUS_TO_ME;

  static readonly DEL_CHAR = Const.DEL_CHAR;

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

  static readonly TAG_ALIAS = Const.TAG_ALIAS;
  static readonly TAG_EMAIL = Const.TAG_EMAIL;
  static readonly TAG_PHONE = Const.TAG_PHONE;

  _host: string;
  _secure: boolean | undefined;
  _appName: string;
  _apiKey: string;
  _browser = '';
  _platform: string;
  _hwos = 'undefined';
  _humanLanguage = 'xx';

  _loggingEnabled = false;
  _trimLongStrings = false;
  _myUID: string | null = null;
  _authenticated = false;
  _login: string | null = null;
  _authToken: AuthToken | null = null;
  _inPacketCount = 0;
  _messageId = Math.floor(Math.random() * 0xffff + 0xffff);
  _serverInfo: ServerParams | null = null;
  _deviceToken: string | null = null;

  _pendingPromises: Record<string, PendingPromise> = {};
  _expirePromises: ReturnType<typeof setInterval> | null = null;

  _connection: Connection;
  _persist = false;
  _db: PersistentCache;
  _cache: Record<string, unknown> = {};

  onWebsocketOpen: (() => void) | undefined = undefined;
  onConnect: (() => void) | undefined = undefined;
  onDisconnect: ((err?: Error | null) => void) | undefined = undefined;
  onLogin: ((code: number, text: string | undefined) => void) | undefined =
    undefined;
  onCtrlMessage: ((ctrl: CtrlMessage) => void) | undefined = undefined;
  onDataMessage: ((data: DataMessage) => void) | undefined = undefined;
  onPresMessage: ((pres: PresMessage) => void) | undefined = undefined;
  onMetaMessage: ((meta: MetaMessage) => void) | undefined = undefined;
  onInfoMessage: ((info: InfoMessage) => void) | undefined = undefined;
  onMessage: ((pkt: ServerMessage) => void) | undefined = undefined;
  onRawMessage: ((text: string) => void) | undefined = undefined;
  onNetworkProbe: (() => void) | undefined = undefined;
  onAutoreconnectIteration: AutoreconnectIterationCallback | undefined =
    undefined;

  constructor(config: TinodeConfig, onComplete?: (err?: unknown) => void) {
    this._host = config.host;
    this._secure = config.secure;
    this._appName = config.appName || 'Undefined';
    this._apiKey = config.apiKey;
    this._platform = config.platform || 'web';

    const product = navigatorField('product');
    if (product === 'ReactNative') {
      this._browser = 'ReactNative';
      this._hwos = this._platform;
    } else if (typeof Reflect.get(globalThis, 'navigator') === 'object') {
      this._browser = getBrowserInfo(navigatorField('userAgent'), product);
      this._hwos = navigatorField('platform') ?? this._hwos;
    }
    this._humanLanguage = navigatorField('language') || 'en-US';

    Connection.logger = this.logger;
    Drafty.logger = this.logger;

    const transport =
      config.transport === 'lp' || config.transport === 'ws'
        ? config.transport
        : detectTransport();
    this._connection = new Connection(
      {
        host: config.host,
        apiKey: config.apiKey,
        transport: transport ?? '',
        secure: config.secure,
      },
      Const.PROTOCOL_VERSION,
      true
    );
    this._connection.onMessage = (data) => {
      this.#dispatchMessage(data);
    };
    this._connection.onOpen = () => this.#connectionOpen();
    this._connection.onDisconnect = (err) => this.#disconnected(err);
    this._connection.onAutoreconnectIteration = (timeout, promise) => {
      if (this.onAutoreconnectIteration) {
        this.onAutoreconnectIteration(timeout, promise);
      }
    };

    this._persist = !!(config.persist || config.storage);
    this._db = new PersistentCache(
      this.logger,
      this.logger,
      resolveStorageAdapter(this._persist, config.storage)
    );

    if (this._persist) {
      this.#loadPersistentCache(onComplete);
    } else {
      this._db.deleteDatabase().then(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }
  }

  #loadPersistentCache(onComplete?: (err?: unknown) => void): void {
    const prom: Promise<unknown>[] = [];
    this._db
      .initDatabase()
      .then(() =>
        this._db.mapTopics((data) => {
          if (this.#cacheGetTopic(data.name)) {
            return;
          }
          let topic: Topic;
          if (data.name === Const.TOPIC_ME) {
            topic = new TopicMe();
          } else if (data.name === Const.TOPIC_FND) {
            topic = new TopicFnd();
          } else {
            topic = new Topic(data.name);
          }
          this._db.deserializeTopic(topic, data);
          this.#attachCacheToTopic(topic);
          topic._cachePutSelf();
          this._db.maxDelId(topic.name).then((clear) => {
            topic._maxDel = Math.max(topic._maxDel, clear || 0);
          });
          delete topic._new;
          prom.push(topic._loadMessages(this._db));
          prom.push(
            this._db.mapSubscriptions(topic.name, (sub) => {
              topic._processMetaSubs([sub], true);
            })
          );
        })
      )
      .then(() =>
        this._db.mapUsers((data) => {
          this.#cachePut('user', data.uid, mergeObj({}, data.public));
        })
      )
      .then(() => Promise.all(prom))
      .then(() => {
        if (onComplete) {
          onComplete();
        }
        this.logger('Persistent cache initialized.');
      })
      .catch((err: unknown) => {
        if (onComplete) {
          onComplete(err);
        }
        this.logger('Failed to initialize persistent cache:', err);
      });
  }

  logger = (str: unknown, ...args: unknown[]): void => {
    if (this._loggingEnabled) {
      const d = new Date();
      const dateString =
        ('0' + d.getUTCHours()).slice(-2) +
        ':' +
        ('0' + d.getUTCMinutes()).slice(-2) +
        ':' +
        ('0' + d.getUTCSeconds()).slice(-2) +
        '.' +
        ('00' + d.getUTCMilliseconds()).slice(-3);

      console.log('[' + dateString + ']', str, args.join(' '));
    }
  };

  #execPromise(
    id: string,
    code: number,
    onOK: CtrlMessage | null,
    errorText?: string
  ): void {
    const callbacks = this._pendingPromises[id];
    if (!callbacks) {
      return;
    }
    delete this._pendingPromises[id];
    if (code >= 200 && code < 400) {
      if (onOK) {
        callbacks.resolve(onOK);
      }
    } else {
      callbacks.reject(new CommError(errorText ?? '', code));
    }
  }

  #execMetaPromise(id: string, meta: MetaMessage): void {
    const callbacks = this._pendingPromises[id];
    if (callbacks?.resolveMeta) {
      delete this._pendingPromises[id];
      callbacks.resolveMeta(meta);
    }
  }

  #send(pkt: ClientMessage, id?: string): void {
    simplify(pkt);
    const msg = JSON.stringify(pkt);
    this.logger(
      'out: ' +
        (this._trimLongStrings ? JSON.stringify(pkt, jsonLoggerHelper) : msg)
    );
    try {
      this._connection.sendText(msg);
    } catch (err) {
      if (id) {
        this.#execPromise(
          id,
          Connection.NETWORK_ERROR,
          null,
          err instanceof Error ? err.message : String(err)
        );
      } else {
        throw err;
      }
    }
  }

  #request(pkt: ClientMessage, id: string | undefined): Promise<CtrlMessage> {
    if (!id) {
      return Promise.reject(new Error('Request has no id'));
    }
    const promise = new Promise<CtrlMessage>((resolve, reject) => {
      this._pendingPromises[id] = { resolve, reject, ts: new Date() };
    });
    this.#send(pkt, id);
    return promise;
  }

  #requestMeta(
    pkt: ClientMessage,
    id: string | undefined
  ): Promise<CtrlMessage | MetaMessage> {
    if (!id) {
      return Promise.reject(new Error('Request has no id'));
    }
    const promise = new Promise<CtrlMessage | MetaMessage>(
      (resolve, reject) => {
        this._pendingPromises[id] = {
          resolve,
          resolveMeta: resolve,
          reject,
          ts: new Date(),
        };
      }
    );
    this.#send(pkt, id);
    return promise;
  }

  #dispatchMessage(data: string): void {
    if (!data) {
      return;
    }

    this._inPacketCount++;

    if (this.onRawMessage) {
      this.onRawMessage(data);
    }

    if (data === '0') {
      if (this.onNetworkProbe) {
        this.onNetworkProbe();
      }
      return;
    }

    const pkt: ServerMessage | null = JSON.parse(data, jsonParseHelper);
    if (!pkt) {
      this.logger('in: ' + data);
      this.logger('ERROR: failed to parse data');
      return;
    }

    this.logger(
      'in: ' +
        (this._trimLongStrings ? JSON.stringify(pkt, jsonLoggerHelper) : data)
    );

    if (this.onMessage) {
      this.onMessage(pkt);
    }

    const ctrl = pkt.ctrl;
    if (ctrl) {
      if (this.onCtrlMessage) {
        this.onCtrlMessage(ctrl);
      }

      if (ctrl.id) {
        this.#execPromise(ctrl.id, ctrl.code, ctrl, ctrl.text);
      }
      setTimeout(() => {
        if (ctrl.code === 205 && ctrl.text === 'evicted') {
          const topic = this.#cacheGetTopic(ctrl.topic);
          if (topic) {
            topic._resetSub();
            if (ctrl.params?.unsub) {
              topic._gone();
            }
          }
        } else if (ctrl.code < 300 && ctrl.params) {
          if (ctrl.params.what === 'data') {
            const topic = this.#cacheGetTopic(ctrl.topic);
            if (topic) {
              topic._allMessagesReceived(ctrl.params.count ?? 0);
            }
          } else if (ctrl.params.what === 'sub') {
            const topic = this.#cacheGetTopic(ctrl.topic);
            if (topic) {
              topic._processMetaSubs([]);
            }
          }
        }
      }, 0);
      return;
    }

    setTimeout(() => {
      if (pkt.meta) {
        const topic = this.#cacheGetTopic(pkt.meta.topic);
        if (topic) {
          topic._routeMeta(pkt.meta);
        }

        if (pkt.meta.id) {
          this.#execMetaPromise(pkt.meta.id, pkt.meta);
        }

        if (this.onMetaMessage) {
          this.onMetaMessage(pkt.meta);
        }
      } else if (pkt.data) {
        const topic = this.#cacheGetTopic(pkt.data.topic);
        if (topic) {
          topic._routeData(pkt.data);
        }

        if (this.onDataMessage) {
          this.onDataMessage(pkt.data);
        }
      } else if (pkt.pres) {
        const topic = this.#cacheGetTopic(pkt.pres.topic);
        if (topic) {
          topic._routePres(pkt.pres);
        }

        if (this.onPresMessage) {
          this.onPresMessage(pkt.pres);
        }
      } else if (pkt.info) {
        const topic = this.#cacheGetTopic(pkt.info.topic);
        if (topic) {
          topic._routeInfo(pkt.info);
        }

        if (this.onInfoMessage) {
          this.onInfoMessage(pkt.info);
        }
      } else {
        this.logger('ERROR: Unknown packet received.');
      }
    }, 0);
  }

  #connectionOpen(): void {
    if (!this._expirePromises) {
      this._expirePromises = setInterval(() => {
        const err = new CommError('timeout', 504);
        const expires = new Date(
          new Date().getTime() - Const.EXPIRE_PROMISES_TIMEOUT
        );
        for (const id in this._pendingPromises) {
          const callbacks = this._pendingPromises[id];
          if (callbacks && callbacks.ts < expires) {
            this.logger('Promise expired', id);
            delete this._pendingPromises[id];
            callbacks.reject(err);
          }
        }
      }, Const.EXPIRE_PROMISES_PERIOD);
    }
    this.hello();
  }

  #disconnected(err: CommError): void {
    this._inPacketCount = 0;
    this._serverInfo = null;
    this._authenticated = false;

    if (this._expirePromises) {
      clearInterval(this._expirePromises);
      this._expirePromises = null;
    }

    this.mapTopics((topic) => {
      topic._resetSub();
    });

    for (const key in this._pendingPromises) {
      this._pendingPromises[key]?.reject(err);
    }
    this._pendingPromises = {};

    if (this.onDisconnect) {
      this.onDisconnect(err);
    }
  }

  #getUserAgent(): string {
    return (
      this._appName +
      ' (' +
      (this._browser ? this._browser + '; ' : '') +
      this._hwos +
      '); ' +
      Const.LIBRARY
    );
  }

  #cachePut(type: 'topic' | 'user', name: string, obj: unknown): void {
    this._cache[type + ':' + name] = obj;
  }

  #cacheGet(type: 'topic' | 'user', name: string | null | undefined): unknown {
    return this._cache[type + ':' + name];
  }

  #cacheDel(type: 'topic' | 'user', name: string): void {
    delete this._cache[type + ':' + name];
  }

  #cacheGetTopic(name: string | null | undefined): Topic | undefined {
    const topic = this.#cacheGet('topic', name);
    return topic instanceof Topic ? topic : undefined;
  }

  #attachCacheToTopic(topic: Topic): void {
    topic._tinode = this;

    topic._cacheGetUser = (uid) => {
      const pub = this.#cacheGet('user', uid);
      if (pub) {
        return {
          user: uid,
          public: mergeObj({}, pub),
        };
      }
      return undefined;
    };
    topic._cachePutUser = (uid, user) => {
      this.#cachePut('user', uid, mergeObj({}, user.public));
    };
    topic._cacheDelUser = (uid) => {
      this.#cacheDel('user', uid);
    };
    topic._cachePutSelf = () => {
      this.#cachePut('topic', topic.name, topic);
    };
    topic._cacheDelSelf = () => {
      this.#cacheDel('topic', topic.name);
    };
  }

  #loginSuccessful(ctrl: CtrlMessage): CtrlMessage {
    if (!ctrl.params || !ctrl.params.user) {
      return ctrl;
    }
    this._myUID = ctrl.params.user;
    this._authenticated = ctrl.code >= 200 && ctrl.code < 300;
    if (ctrl.params.token && ctrl.params.expires) {
      this._authToken = {
        token: ctrl.params.token,
        expires: ctrl.params.expires,
      };
    } else {
      this._authToken = null;
    }

    if (this.onLogin) {
      this.onLogin(ctrl.code, ctrl.text);
    }

    return ctrl;
  }

  static credential(
    meth?: string | Credential | null,
    val?: string | null,
    params?: unknown,
    resp?: string | null
  ): Credential[] | null {
    if (meth && typeof meth === 'object') {
      ({ val, params, resp, meth } = meth);
    }
    if (meth && (val || resp)) {
      return [
        {
          meth: meth,
          val: val ?? undefined,
          resp: resp ?? undefined,
          params: params,
        },
      ];
    }
    return null;
  }

  static topicType(name: string | null | undefined) {
    return Topic.topicType(name);
  }

  static isMeTopicName(name: string | null | undefined): boolean {
    return Topic.isMeTopicName(name);
  }

  static isSelfTopicName(name: string | null | undefined): boolean {
    return Topic.isSelfTopicName(name);
  }

  static isGroupTopicName(name: string | null | undefined): boolean {
    return Topic.isGroupTopicName(name);
  }

  static isP2PTopicName(name: string | null | undefined): boolean {
    return Topic.isP2PTopicName(name);
  }

  static isCommTopicName(name: string | null | undefined): boolean {
    return Topic.isCommTopicName(name);
  }

  static isNewGroupTopicName(name: string | null | undefined): boolean {
    return Topic.isNewGroupTopicName(name);
  }

  static isChannelTopicName(name: string | null | undefined): boolean {
    return Topic.isChannelTopicName(name);
  }

  static getVersion(): string {
    return Const.VERSION;
  }

  static setNetworkProviders(
    wsProvider?: WebSocketProviderType | null,
    xhrProvider?: XHRProviderType | null
  ): void {
    WebSocketProvider = wsProvider ?? undefined;
    XHRProvider = xhrProvider ?? undefined;

    Connection.setNetworkProviders(WebSocketProvider, XHRProvider);
    LargeFileHelper.setNetworkProvider(XHRProvider);
  }

  static getLibrary(): string {
    return Const.LIBRARY;
  }

  static isNullValue(str: unknown): boolean {
    return str === Const.DEL_CHAR;
  }

  static isServerAssignedSeq(seq: number): boolean {
    return seq > 0 && seq < Const.LOCAL_SEQID;
  }

  static parseTinodeUrl(tinodeUrl: unknown): string | null {
    if (!tinodeUrl || typeof tinodeUrl !== 'string') {
      return null;
    }
    if (!tinodeUrl.startsWith('tinode:')) {
      return tinodeUrl;
    }
    const parts = tinodeUrl.substring(7).split('/');
    if (parts.length < 2 || parts[parts.length - 2] !== 'id') {
      return tinodeUrl;
    }
    return parts[parts.length - 1] ?? tinodeUrl;
  }

  static isValidTagValue(tag: unknown): boolean {
    const ALIAS_REGEX = /^[a-z0-9][a-z0-9_-]{3,23}$/i;
    return (
      typeof tag === 'string' &&
      tag.length > 3 &&
      tag.length < 24 &&
      ALIAS_REGEX.test(tag)
    );
  }

  static tagSplit(
    tag: string | null | undefined
  ): { prefix: string; value: string } | null {
    if (!tag) {
      return null;
    }

    tag = tag.trim();

    const splitAt = tag.indexOf(':');
    if (splitAt <= 0) {
      return null;
    }

    const value = tag.substring(splitAt + 1);
    if (!value) {
      return null;
    }
    return {
      prefix: tag.substring(0, splitAt),
      value: value,
    };
  }

  static setUniqueTag(
    tags: string[] | null | undefined,
    uniqueTag: string
  ): string[] {
    if (!tags || tags.length === 0) {
      return [uniqueTag];
    }

    const parts = Tinode.tagSplit(uniqueTag);
    if (!parts) {
      return tags;
    }

    const result = tags.filter((tag) => tag && !tag.startsWith(parts.prefix));
    result.push(uniqueTag);
    return result;
  }

  static clearTagPrefix(
    tags: (string | null | undefined)[] | null | undefined,
    prefix: string
  ): string[] {
    if (!tags || tags.length === 0) {
      return [];
    }
    return tags.filter(
      (tag): tag is string => !!tag && !tag.startsWith(prefix)
    );
  }

  static tagByPrefix(
    tags: (string | null | undefined)[] | null | undefined,
    prefix: string
  ): string | undefined {
    if (!tags) {
      return undefined;
    }
    return tags.find((tag): tag is string => !!tag && tag.startsWith(prefix));
  }

  getNextUniqueId(): string | undefined {
    return this._messageId !== 0 ? '' + this._messageId++ : undefined;
  }

  connect(host_?: string | null): Promise<void> {
    return this._connection.connect(host_);
  }

  reconnect(force?: boolean): void {
    this._connection.reconnect(force);
  }

  disconnect(): void {
    this._connection.disconnect();
  }

  clearStorage(): Promise<unknown> {
    if (this._db.isReady()) {
      return this._db.deleteDatabase();
    }
    return Promise.resolve();
  }

  initStorage(): Promise<unknown> {
    if (!this._db.isReady()) {
      return this._db.initDatabase();
    }
    return Promise.resolve();
  }

  networkProbe(): void {
    this._connection.probe();
  }

  isConnected(): boolean {
    return this._connection.isConnected();
  }

  isAuthenticated(): boolean {
    return this._authenticated;
  }

  authorizeURL<T>(url: T): T | string {
    if (typeof url !== 'string') {
      return url;
    }

    if (isUrlRelative(url)) {
      const base = 'scheme://host/';
      const parsed = new URL(url, base);
      if (this._apiKey) {
        parsed.searchParams.append('apikey', this._apiKey);
      }
      if (this._authToken && this._authToken.token) {
        parsed.searchParams.append('auth', 'token');
        parsed.searchParams.append('secret', this._authToken.token);
      }
      return parsed.toString().substring(base.length - 1);
    }
    return url;
  }

  account(
    uid: string | null,
    scheme: string | null,
    secret: string | null,
    login?: boolean,
    params?: AccountParams
  ): Promise<CtrlMessage> {
    const acc: AccPacket = {
      id: this.getNextUniqueId(),
      user: uid,
      scheme: scheme,
      secret: secret,
      login: login,
      desc: {},
    };
    const pkt: ClientMessage = { acc };

    if (params) {
      acc.desc.defacs = params.defacs;
      acc.desc.public = params.public;
      acc.desc.private = params.private;
      acc.desc.trusted = params.trusted;

      acc.tags = params.tags;
      acc.cred = params.cred;

      acc.tmpscheme = params.scheme;
      acc.tmpsecret = params.secret;

      if (Array.isArray(params.attachments) && params.attachments.length > 0) {
        pkt.extra = {
          attachments: params.attachments.filter((ref) => isUrlRelative(ref)),
        };
      }
    }

    return this.#request(pkt, acc.id);
  }

  createAccount(
    scheme: string,
    secret: string,
    login?: boolean,
    params?: AccountParams
  ): Promise<CtrlMessage> {
    let promise = this.account(Const.USER_NEW, scheme, secret, login, params);
    if (login) {
      promise = promise.then((ctrl) => this.#loginSuccessful(ctrl));
    }
    return promise;
  }

  createAccountBasic(
    username: string | null | undefined,
    password: string | null | undefined,
    params?: AccountParams
  ): Promise<CtrlMessage> {
    username = username || '';
    password = password || '';
    return this.createAccount(
      'basic',
      b64EncodeUnicode(username + ':' + password),
      true,
      params
    );
  }

  updateAccountBasic(
    uid: string | null,
    username: string | null | undefined,
    password: string | null | undefined,
    params?: AccountParams
  ): Promise<CtrlMessage> {
    username = username || '';
    password = password || '';
    return this.account(
      uid,
      'basic',
      b64EncodeUnicode(username + ':' + password),
      false,
      params
    );
  }

  hello(): Promise<CtrlMessage | undefined> {
    const id = this.getNextUniqueId();
    const pkt: ClientMessage = {
      hi: {
        id: id,
        ver: Const.VERSION,
        ua: this.#getUserAgent(),
        dev: this._deviceToken,
        lang: this._humanLanguage,
        platf: this._platform,
      },
    };

    return this.#request(pkt, id)
      .then((ctrl) => {
        this._connection.backoffReset();

        if (ctrl.params) {
          this._serverInfo = ctrl.params;
        }

        if (this.onConnect) {
          this.onConnect();
        }

        return ctrl;
      })
      .catch((err: unknown) => {
        this._connection.reconnect(true);

        if (this.onDisconnect) {
          this.onDisconnect(
            err instanceof Error ? err : new Error(String(err))
          );
        }
        return undefined;
      });
  }

  setDeviceToken(dt: string | null | undefined | false): boolean {
    let sent = false;
    const token = dt || null;
    if (token !== this._deviceToken) {
      this._deviceToken = token;
      if (this.isConnected() && this.isAuthenticated()) {
        this.#send({
          hi: {
            dev: token || Tinode.DEL_CHAR,
          },
        });
        sent = true;
      }
    }
    return sent;
  }

  login(
    scheme: string,
    secret: string,
    cred?: Credential[] | null
  ): Promise<CtrlMessage> {
    const id = this.getNextUniqueId();
    const pkt: ClientMessage = {
      login: {
        id: id,
        scheme: scheme,
        secret: secret,
        cred: cred,
      },
    };

    return this.#request(pkt, id).then((ctrl) => this.#loginSuccessful(ctrl));
  }

  loginBasic(
    uname: string,
    password: string,
    cred?: Credential[] | null
  ): Promise<CtrlMessage> {
    return this.login(
      'basic',
      b64EncodeUnicode(uname + ':' + password),
      cred
    ).then((ctrl) => {
      this._login = uname;
      return ctrl;
    });
  }

  loginToken(token: string, cred?: Credential[] | null): Promise<CtrlMessage> {
    return this.login('token', token, cred);
  }

  requestResetAuthSecret(
    scheme: string,
    method: string,
    value: string
  ): Promise<CtrlMessage> {
    return this.login(
      'reset',
      b64EncodeUnicode(scheme + ':' + method + ':' + value)
    );
  }

  getAuthToken(): AuthToken | null {
    if (this._authToken && this._authToken.expires.getTime() > Date.now()) {
      return this._authToken;
    }
    this._authToken = null;
    return null;
  }

  setAuthToken(token: AuthToken | null): void {
    this._authToken = token;
  }

  subscribe(
    topicName: string,
    getParams?: GetQuery,
    setParams?: SetParams
  ): Promise<CtrlMessage> {
    const sub: SubPacket = {
      id: this.getNextUniqueId(),
      topic: topicName,
      set: {},
      get: getParams,
    };
    const pkt: ClientMessage = { sub };
    const name = topicName || Const.TOPIC_NEW;

    if (setParams) {
      if (setParams.sub) {
        sub.set.sub = setParams.sub;
      }

      const desc = setParams.desc;
      if (desc) {
        if (Tinode.isNewGroupTopicName(name)) {
          sub.set.desc = desc;
        } else if (Tinode.isP2PTopicName(name) && desc.defacs) {
          sub.set.desc = {
            defacs: desc.defacs,
          };
        }
      }

      if (
        Array.isArray(setParams.attachments) &&
        setParams.attachments.length > 0
      ) {
        pkt.extra = {
          attachments: setParams.attachments.filter((ref) =>
            isUrlRelative(ref)
          ),
        };
      }

      if (setParams.tags) {
        sub.set.tags = setParams.tags;
      }
      if (setParams.aux) {
        sub.set.aux = setParams.aux;
      }
    }
    return this.#request(pkt, sub.id);
  }

  leave(topic: string, unsub?: boolean): Promise<CtrlMessage> {
    const id = this.getNextUniqueId();
    return this.#request({ leave: { id, topic, unsub } }, id);
  }

  createMessage(
    topic: string,
    content: DraftyDoc | string,
    noEcho?: boolean
  ): PubMessage {
    const dft = typeof content === 'string' ? Drafty.parse(content) : content;
    let head: PubMessage['head'] = null;
    if (dft && !Drafty.isPlainText(dft)) {
      head = {
        mime: Drafty.getContentType(),
      };
      content = dft;
    }
    return {
      id: this.getNextUniqueId(),
      topic: topic,
      noecho: noEcho,
      head: head,
      content: content,
    };
  }

  publish(
    topicName: string,
    content: DraftyDoc | string,
    noEcho?: boolean
  ): Promise<CtrlMessage> {
    return this.publishMessage(this.createMessage(topicName, content, noEcho));
  }

  publishMessage(
    pub: PubMessage,
    attachments?: string[] | null
  ): Promise<CtrlMessage> {
    const msg: PubMessage = {
      ...pub,
      seq: undefined,
      from: undefined,
      ts: undefined,
    };
    const pkt: ClientMessage = {
      pub: msg,
    };
    if (attachments) {
      pkt.extra = {
        attachments: attachments.filter((ref) => isUrlRelative(ref)),
      };
    }
    return this.#request(pkt, msg.id);
  }

  oobNotification(data: PushPayload): void {
    this.logger(
      'oob: ' +
        (this._trimLongStrings ? JSON.stringify(data, jsonLoggerHelper) : data)
    );

    switch (data.what) {
      case 'msg': {
        if (!data.seq || data.seq < 1 || !data.topic) {
          break;
        }

        if (!this.isConnected()) {
          break;
        }

        const topic = this.#cacheGetTopic(data.topic);
        if (!topic) {
          break;
        }

        if (topic.isSubscribed()) {
          break;
        }

        if (topic.maxMsgSeq() < data.seq) {
          if (topic.isChannelType()) {
            topic._updateReceived(data.seq, 'fake-uid');
          }

          if (data.xfrom && !this.#cacheGet('user', data.xfrom)) {
            this.getMeta(
              data.xfrom,
              new MetaGetBuilder(topic).withDesc().build()
            ).catch((err: unknown) => {
              this.logger('Failed to get the name of a new sender', err);
            });
          }

          topic
            .subscribe()
            .then(() =>
              topic.getMeta(
                new MetaGetBuilder(topic)
                  .withLaterData(24)
                  .withLaterDel(24)
                  .build()
              )
            )
            .then(() => {
              topic.leaveDelayed(false, 1000);
            })
            .catch((err: unknown) => {
              this.logger('On push data fetch failed', err);
            })
            .finally(() => {
              this.getMeTopic()._refreshContact('msg', topic);
            });
        }
        break;
      }

      case 'read':
        this.getMeTopic()._routePres({
          what: 'read',
          seq: data.seq,
        });
        break;

      case 'sub': {
        if (!this.isMe(data.xfrom)) {
          break;
        }

        const mode = {
          given: data.modeGiven,
          want: data.modeWant,
        };
        const acs = new AccessMode(mode);
        const pres: PresMessage =
          !acs.mode || acs.mode === AccessMode._NONE
            ? {
                what: 'gone',
                src: data.topic,
              }
            : {
                what: 'acs',
                src: data.topic,
                dacs: mode,
              };
        this.getMeTopic()._routePres(pres);
        break;
      }

      default:
        this.logger('Unknown push type ignored', data.what);
    }
  }

  getMeta(
    topic: string,
    params?: GetQuery
  ): Promise<CtrlMessage | MetaMessage> {
    const id = this.getNextUniqueId();
    const get = mergeObj<GetPacket>({ id, topic }, params);
    return this.#requestMeta({ get }, id);
  }

  setMeta(topic: string, params: SetParams): Promise<CtrlMessage> {
    const set: SetPacket = { id: this.getNextUniqueId(), topic };
    const pkt: ClientMessage = { set };
    const what: string[] = [];

    if (params) {
      if ('desc' in params) {
        what.push('desc');
        set.desc = params.desc;
      }
      if ('sub' in params) {
        what.push('sub');
        set.sub = params.sub;
      }
      if ('tags' in params) {
        what.push('tags');
        set.tags = params.tags;
      }
      if ('cred' in params) {
        what.push('cred');
        set.cred = params.cred;
      }
      if ('aux' in params) {
        what.push('aux');
        set.aux = params.aux;
      }

      if (Array.isArray(params.attachments) && params.attachments.length > 0) {
        pkt.extra = {
          attachments: params.attachments.filter((ref) => isUrlRelative(ref)),
        };
      }
    }

    if (what.length === 0) {
      return Promise.reject(new Error('Invalid {set} parameters'));
    }

    return this.#request(pkt, set.id);
  }

  delMessages(
    topic: string,
    ranges: SeqRange[],
    hard?: boolean
  ): Promise<CtrlMessage> {
    const del: DelPacket = {
      id: this.getNextUniqueId(),
      topic: topic,
      what: 'msg',
      delseq: ranges,
      hard: hard,
    };
    return this.#request({ del }, del.id);
  }

  delTopic(topicName: string, hard?: boolean): Promise<CtrlMessage> {
    const del: DelPacket = {
      id: this.getNextUniqueId(),
      topic: topicName,
      what: 'topic',
      hard: hard,
    };
    return this.#request({ del }, del.id);
  }

  delSubscription(topicName: string, user: string): Promise<CtrlMessage> {
    const del: DelPacket = {
      id: this.getNextUniqueId(),
      topic: topicName,
      what: 'sub',
      user: user,
    };
    return this.#request({ del }, del.id);
  }

  delCredential(method: string, value: string): Promise<CtrlMessage> {
    const del: DelPacket = {
      id: this.getNextUniqueId(),
      topic: Const.TOPIC_ME,
      what: 'cred',
      cred: {
        meth: method,
        val: value,
      },
    };
    return this.#request({ del }, del.id);
  }

  delCurrentUser(hard?: boolean): Promise<void> {
    const del: DelPacket = {
      id: this.getNextUniqueId(),
      topic: null,
      what: 'user',
      hard: hard,
    };
    return this.#request({ del }, del.id).then(() => {
      this._myUID = null;
    });
  }

  note(topicName: string, what: 'recv' | 'read', seq: number): void {
    if (seq <= 0 || seq >= Const.LOCAL_SEQID) {
      throw new Error(`Invalid message id ${seq}`);
    }

    const note: NotePacket = {
      topic: topicName,
      what: what,
      seq: seq,
    };
    this.#send({ note });
  }

  noteKeyPress(topicName: string, type?: 'kp' | 'kpa' | 'kpv'): void {
    const note: NotePacket = {
      topic: topicName,
      what: type || 'kp',
    };
    this.#send({ note });
  }

  videoCall(
    topicName: string,
    seq: number,
    evt: string,
    payload?: unknown
  ): void {
    const note: NotePacket = {
      topic: topicName,
      seq: seq,
      what: 'call',
      event: evt,
      payload: payload,
    };
    this.#send({ note }, note.id);
  }

  getTopic(topicName: typeof Const.TOPIC_ME): TopicMe;
  getTopic(topicName: typeof Const.TOPIC_FND): TopicFnd;
  getTopic(topicName: string | null | undefined): Topic | undefined;
  getTopic(topicName: string | null | undefined): Topic | undefined {
    let topic = this.#cacheGetTopic(topicName);
    if (!topic && topicName) {
      if (topicName === Const.TOPIC_ME) {
        topic = new TopicMe();
      } else if (topicName === Const.TOPIC_FND) {
        topic = new TopicFnd();
      } else {
        topic = new Topic(topicName);
      }
      this.#attachCacheToTopic(topic);
      topic._cachePutSelf();
    }
    return topic;
  }

  cacheGetTopic(topicName: string | null | undefined): Topic | undefined {
    return this.#cacheGetTopic(topicName);
  }

  cacheRemTopic(topicName: string): void {
    this.#cacheDel('topic', topicName);
  }

  mapTopics(
    func: (topic: Topic, key: string) => boolean | void,
    context?: unknown
  ): void {
    for (const idx in this._cache) {
      const topic = this._cache[idx];
      if (idx.startsWith('topic:') && topic instanceof Topic) {
        if (func.call(context, topic, idx)) {
          break;
        }
      }
    }
  }

  isTopicCached(topicName: string): boolean {
    return !!this.#cacheGetTopic(topicName);
  }

  newGroupTopicName(isChan?: boolean): string {
    return (
      (isChan ? Const.TOPIC_NEW_CHAN : Const.TOPIC_NEW) + this.getNextUniqueId()
    );
  }

  getMeTopic(): TopicMe {
    return this.getTopic(Const.TOPIC_ME);
  }

  getFndTopic(): TopicFnd {
    return this.getTopic(Const.TOPIC_FND);
  }

  getLargeFileHelper(): LargeFileHelper {
    return new LargeFileHelper(this, Const.PROTOCOL_VERSION);
  }

  getCurrentUserID(): string | null {
    return this._myUID;
  }

  isMe(uid: string | null | undefined): boolean {
    return this._myUID === uid;
  }

  getCurrentLogin(): string | null {
    return this._login;
  }

  getServerInfo(): ServerParams | null {
    return this._serverInfo;
  }

  report(action: string, target: string): Promise<CtrlMessage> {
    return this.publish(
      Const.TOPIC_SYS,
      Drafty.attachJSON(null, {
        action: action,
        target: target,
      })
    );
  }

  getServerParam(name: string, defaultValue?: unknown): unknown {
    return (this._serverInfo && this._serverInfo[name]) || defaultValue;
  }

  enableLogging(enabled: boolean, trimLongStrings?: boolean): void {
    this._loggingEnabled = enabled;
    this._trimLongStrings = enabled && !!trimLongStrings;
  }

  setHumanLanguage(hl: string | null | undefined): void {
    if (hl) {
      this._humanLanguage = hl;
    }
  }

  isTopicOnline(name: string): boolean {
    return !!this.#cacheGetTopic(name)?.online;
  }

  getTopicAccessMode(name: string): AccessMode | null {
    const topic = this.#cacheGetTopic(name);
    return topic ? topic.acs : null;
  }

  wantAkn(status: boolean): void {
    if (status) {
      this._messageId = Math.floor(Math.random() * 0xffffff + 0xffffff);
    } else {
      this._messageId = 0;
    }
  }
}
