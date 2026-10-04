import CommError from './comm-error';
import { BACKOFF_BASE, BACKOFF_MAX_ITER, BACKOFF_JITTER } from './config';
import { jsonParseHelper } from './utils';

type Handler<E> = { bivarianceHack(evt: E): void }['bivarianceHack'];

export type WebSocketEventName = 'open' | 'close' | 'error' | 'message';

export interface WebSocketEventLike {
  data?: unknown;
}

export interface WebSocketLike {
  readyState: number;
  addEventListener(
    type: WebSocketEventName,
    listener: (evt: WebSocketEventLike) => void
  ): void;
  send(data: string): void;
  close(): void;
}

export interface LongPollRequestLike {
  readyState: number;
  status: number;
  responseText: string;
  onreadystatechange: Handler<unknown> | null;
  open(method: string, url: string, async: boolean): void;
  send(body?: string | null): void;
  abort(): void;
}

export type WebSocketProviderType = new (url: string) => WebSocketLike;
export type XHRProviderType = new () => LongPollRequestLike;

export type ConnectionTransport = 'ws' | 'lp';

export type ConnectionLogger = (...args: unknown[]) => void;

export interface ConnectionConfig {
  host: string;
  apiKey: string;
  transport: string;
  secure?: boolean;
}

export type AutoreconnectIterationCallback = (
  timeout: number,
  promise?: Promise<void>
) => void;

let WebSocketProvider: WebSocketProviderType | undefined;
let XHRProvider: XHRProviderType | undefined;

const NETWORK_ERROR = 503;
const NETWORK_ERROR_TEXT = 'Connection failed';

const NETWORK_USER = 418;
const NETWORK_USER_TEXT = 'Disconnected by client';

const XDR_OPENED = 1;
const XDR_DONE = 4;
const WS_OPEN = 1;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;

const UNKNOWN_TRANSPORT_MESSAGE =
  "Unknown or invalid network transport. Running under Node? Call 'Tinode.setNetworkProviders()'.";

function resolveWebSocketProvider(): WebSocketProviderType | undefined {
  return WebSocketProvider ?? globalThis.WebSocket;
}

function resolveXHRProvider(): XHRProviderType | undefined {
  return XHRProvider ?? globalThis.XMLHttpRequest;
}

function makeBaseUrl(
  host: string,
  protocol: string,
  version: string,
  apiKey: string
): string | null {
  if (!['http', 'https', 'ws', 'wss'].includes(protocol)) {
    return null;
  }
  let url = `${protocol}://${host}`;
  if (url.charAt(url.length - 1) !== '/') {
    url += '/';
  }
  url += 'v' + version + '/channels';
  if (['http', 'https'].includes(protocol)) {
    url += '/lp';
  }
  url += '?apikey=' + apiKey;
  return url;
}

function extractSid(packet: unknown): string {
  if (typeof packet === 'object' && packet !== null && 'ctrl' in packet) {
    const ctrl = packet.ctrl;
    if (typeof ctrl === 'object' && ctrl !== null && 'params' in ctrl) {
      const params = ctrl.params;
      if (typeof params === 'object' && params !== null && 'sid' in params) {
        return String(params.sid);
      }
    }
  }
  throw new Error('Long poller received a malformed handshake');
}

export default class Connection {
  static readonly NETWORK_ERROR = NETWORK_ERROR;
  static readonly NETWORK_ERROR_TEXT = NETWORK_ERROR_TEXT;
  static readonly NETWORK_USER = NETWORK_USER;
  static readonly NETWORK_USER_TEXT = NETWORK_USER_TEXT;

  static #log: ConnectionLogger = () => {};

  #boffTimer: ReturnType<typeof setTimeout> | null = null;
  #boffIteration = 0;
  #boffClosed = false;

  #socket: WebSocketLike | null = null;

  host: string;
  secure: boolean | undefined;
  apiKey: string;

  version: string;
  autoreconnect: boolean;

  initialized: ConnectionTransport | undefined;

  onMessage: ((message: string) => void) | undefined = undefined;
  onDisconnect: ((err: CommError, code: number) => void) | undefined =
    undefined;
  onOpen: (() => void) | undefined = undefined;
  onAutoreconnectIteration: AutoreconnectIterationCallback | undefined =
    undefined;

  connect: (host_?: string | null, force?: boolean) => Promise<void> = () =>
    Promise.reject(null);
  reconnect: (force?: boolean) => void = () => {};
  disconnect: () => void = () => {};
  sendText: (msg: string) => void = () => {};
  isConnected: () => boolean = () => false;

  constructor(
    config: ConnectionConfig,
    version_: string,
    autoreconnect_: boolean
  ) {
    this.host = config.host;
    this.secure = config.secure;
    this.apiKey = config.apiKey;

    this.version = version_;
    this.autoreconnect = autoreconnect_;

    if (config.transport === 'lp' && resolveXHRProvider()) {
      this.#init_lp();
      this.initialized = 'lp';
    } else if (config.transport === 'ws' && resolveWebSocketProvider()) {
      this.#init_ws();
      this.initialized = 'ws';
    }

    if (!this.initialized) {
      Connection.#log(UNKNOWN_TRANSPORT_MESSAGE);
      throw new Error(UNKNOWN_TRANSPORT_MESSAGE);
    }
  }

  static setNetworkProviders(
    wsProvider?: WebSocketProviderType,
    xhrProvider?: XHRProviderType
  ): void {
    WebSocketProvider = wsProvider;
    XHRProvider = xhrProvider;
  }

  static set logger(l: ConnectionLogger) {
    Connection.#log = l;
  }

  transport(): ConnectionTransport | undefined {
    return this.initialized;
  }

  probe(): void {
    this.sendText('1');
  }

  backoffReset(): void {
    this.#boffReset();
  }

  #boffReconnect(): void {
    if (this.#boffTimer !== null) {
      clearTimeout(this.#boffTimer);
    }
    const timeout =
      BACKOFF_BASE *
      (Math.pow(2, this.#boffIteration) *
        (1.0 + BACKOFF_JITTER * Math.random()));
    this.#boffIteration =
      this.#boffIteration >= BACKOFF_MAX_ITER
        ? this.#boffIteration
        : this.#boffIteration + 1;
    if (this.onAutoreconnectIteration) {
      this.onAutoreconnectIteration(timeout);
    }

    this.#boffTimer = setTimeout(() => {
      Connection.#log(
        `Reconnecting, iter=${this.#boffIteration}, timeout=${timeout}`
      );
      if (!this.#boffClosed) {
        const prom = this.connect();
        if (this.onAutoreconnectIteration) {
          this.onAutoreconnectIteration(0, prom);
        } else {
          prom.catch(() => {});
        }
      } else if (this.onAutoreconnectIteration) {
        this.onAutoreconnectIteration(-1);
      }
    }, timeout);
  }

  #boffStop(): void {
    if (this.#boffTimer !== null) {
      clearTimeout(this.#boffTimer);
    }
    this.#boffTimer = null;
  }

  #boffReset(): void {
    this.#boffIteration = 0;
  }

  #init_lp(): void {
    const Provider = resolveXHRProvider();
    if (!Provider) {
      throw new Error(UNKNOWN_TRANSPORT_MESSAGE);
    }

    let _lpURL: string | null = null;
    let _poller: LongPollRequestLike | null = null;
    let _sender: LongPollRequestLike | null = null;

    const lp_sender = (url_: string): LongPollRequestLike => {
      const sender = new Provider();
      sender.onreadystatechange = () => {
        if (sender.readyState === XDR_DONE && sender.status >= 400) {
          throw new CommError('LP sender failed', sender.status);
        }
      };

      sender.open('POST', url_, true);
      return sender;
    };

    const lp_poller = (
      url_: string,
      resolve?: () => void,
      reject?: (reason: unknown) => void
    ): LongPollRequestLike => {
      const poller = new Provider();
      let promiseCompleted = false;

      const startNext = () => {
        if (_lpURL === null) {
          return;
        }
        const next = lp_poller(_lpURL);
        _poller = next;
        next.send(null);
      };

      poller.onreadystatechange = () => {
        if (poller.readyState !== XDR_DONE) {
          return;
        }
        if (poller.status === HTTP_CREATED) {
          const pkt: unknown = JSON.parse(poller.responseText, jsonParseHelper);
          _lpURL = url_ + '&sid=' + extractSid(pkt);
          startNext();
          if (this.onOpen) {
            this.onOpen();
          }

          if (resolve) {
            promiseCompleted = true;
            resolve();
          }

          if (this.autoreconnect) {
            this.#boffStop();
          }
        } else if (poller.status > 0 && poller.status < HTTP_BAD_REQUEST) {
          if (this.onMessage) {
            this.onMessage(poller.responseText);
          }
          startNext();
        } else {
          if (reject && !promiseCompleted) {
            promiseCompleted = true;
            reject(poller.responseText);
          }
          if (this.onMessage && poller.responseText) {
            this.onMessage(poller.responseText);
          }
          if (this.onDisconnect) {
            const code =
              poller.status ||
              (this.#boffClosed ? NETWORK_USER : NETWORK_ERROR);
            const text =
              poller.responseText ||
              (this.#boffClosed ? NETWORK_USER_TEXT : NETWORK_ERROR_TEXT);
            this.onDisconnect(new CommError(text, code), code);
          }

          _poller = null;
          if (!this.#boffClosed && this.autoreconnect) {
            this.#boffReconnect();
          }
        }
      };
      poller.open('POST', url_, true);
      return poller;
    };

    const abortRequest = (request: LongPollRequestLike | null): void => {
      if (request) {
        request.onreadystatechange = null;
        request.abort();
      }
    };

    this.connect = (host_, force) => {
      this.#boffClosed = false;

      if (_poller) {
        if (!force) {
          return Promise.resolve();
        }
        abortRequest(_poller);
        _poller = null;
      }

      if (host_) {
        this.host = host_;
      }

      return new Promise<void>((resolve, reject) => {
        const url = makeBaseUrl(
          this.host,
          this.secure ? 'https' : 'http',
          this.version,
          this.apiKey
        );
        if (url === null) {
          reject(new Error('Invalid long polling URL'));
          return;
        }
        Connection.#log('LP connecting to:', url);
        const first = lp_poller(url, resolve, reject);
        _poller = first;
        first.send(null);
      }).catch((err: unknown) => {
        Connection.#log('LP connection failed:', err);
      });
    };

    this.reconnect = (force) => {
      this.#boffStop();
      this.connect(null, force);
    };

    this.disconnect = () => {
      this.#boffClosed = true;
      this.#boffStop();

      abortRequest(_sender);
      _sender = null;
      abortRequest(_poller);
      _poller = null;

      if (this.onDisconnect) {
        this.onDisconnect(
          new CommError(NETWORK_USER_TEXT, NETWORK_USER),
          NETWORK_USER
        );
      }
      _lpURL = null;
    };

    this.sendText = (msg) => {
      if (_lpURL === null) {
        throw new Error('Long poller failed to connect');
      }
      const sender = lp_sender(_lpURL);
      _sender = sender;
      if (sender.readyState === XDR_OPENED) {
        sender.send(msg);
      } else {
        throw new Error('Long poller failed to connect');
      }
    };

    this.isConnected = () => _poller !== null;
  }

  #init_ws(): void {
    const Provider = resolveWebSocketProvider();
    if (!Provider) {
      throw new Error(UNKNOWN_TRANSPORT_MESSAGE);
    }

    const isSocketOpen = (): boolean =>
      this.#socket !== null && this.#socket.readyState === WS_OPEN;

    this.connect = (host_, force) => {
      this.#boffClosed = false;

      if (this.#socket) {
        if (!force && isSocketOpen()) {
          this.probe();
          return Promise.resolve();
        }
        this.#socket.close();
        this.#socket = null;
      }

      if (host_) {
        this.host = host_;
      }

      return new Promise<void>((resolve, reject) => {
        const url = makeBaseUrl(
          this.host,
          this.secure ? 'wss' : 'ws',
          this.version,
          this.apiKey
        );
        if (url === null) {
          reject(new Error('Invalid websocket URL'));
          return;
        }

        Connection.#log('WS connecting to: ', url);

        const conn = new Provider(url);

        conn.addEventListener('error', (err) => {
          reject(err);
        });

        conn.addEventListener('open', () => {
          if (this.autoreconnect) {
            this.#boffStop();
          }

          if (this.onOpen) {
            this.onOpen();
          }

          resolve();
        });

        conn.addEventListener('close', () => {
          this.#socket = null;

          if (this.onDisconnect) {
            const code = this.#boffClosed ? NETWORK_USER : NETWORK_ERROR;
            this.onDisconnect(
              new CommError(
                this.#boffClosed ? NETWORK_USER_TEXT : NETWORK_ERROR_TEXT,
                code
              ),
              code
            );
          }

          if (!this.#boffClosed && this.autoreconnect) {
            this.#boffReconnect();
          }
        });

        conn.addEventListener('message', (evt) => {
          if (this.onMessage) {
            this.onMessage(String(evt.data));
          }
        });

        this.#socket = conn;
      });
    };

    this.reconnect = (force) => {
      this.#boffStop();
      this.connect(null, force);
    };

    this.disconnect = () => {
      this.#boffClosed = true;
      this.#boffStop();

      if (!this.#socket) {
        return;
      }
      this.#socket.close();
      this.#socket = null;
    };

    this.sendText = (msg) => {
      if (this.#socket && isSocketOpen()) {
        this.#socket.send(msg);
      } else {
        throw new Error('Websocket is not connected');
      }
    };

    this.isConnected = isSocketOpen;
  }
}
