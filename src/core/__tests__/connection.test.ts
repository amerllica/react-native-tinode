import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import Connection from '../connection';
import type {
  LongPollRequestLike,
  WebSocketEventLike,
  WebSocketEventName,
  WebSocketLike,
} from '../connection';
import { BACKOFF_BASE } from '../config';

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const SOCKET_CLOSED = 3;
const REQUEST_OPENED = 1;
const REQUEST_DONE = 4;

type Listener = (evt: WebSocketEventLike) => void;

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];

  readyState = SOCKET_CONNECTING;
  sent: string[] = [];
  readonly url: string;
  private readonly listeners = new Map<WebSocketEventName, Listener[]>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: WebSocketEventName, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = SOCKET_CLOSED;
  }

  emit(type: WebSocketEventName, evt: WebSocketEventLike = {}): void {
    if (type === 'open') {
      this.readyState = SOCKET_OPEN;
    }
    if (type === 'close') {
      this.readyState = SOCKET_CLOSED;
    }
    (this.listeners.get(type) ?? []).forEach((listener) => listener(evt));
  }

  static latest(): FakeWebSocket {
    const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    if (!socket) {
      throw new Error('No socket was created');
    }
    return socket;
  }
}

class FakeRequest implements LongPollRequestLike {
  static instances: FakeRequest[] = [];

  readyState = 0;
  status = 0;
  responseText = '';
  onreadystatechange: ((evt: unknown) => void) | null = null;
  method = '';
  url = '';
  body: string | null | undefined = undefined;
  aborted = false;

  constructor() {
    FakeRequest.instances.push(this);
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
    this.readyState = REQUEST_OPENED;
  }

  send(body?: string | null): void {
    this.body = body;
  }

  abort(): void {
    this.aborted = true;
  }

  respond(status: number, responseText: string): void {
    this.readyState = REQUEST_DONE;
    this.status = status;
    this.responseText = responseText;
    this.onreadystatechange?.({});
  }

  static latest(): FakeRequest {
    const request = FakeRequest.instances[FakeRequest.instances.length - 1];
    if (!request) {
      throw new Error('No request was created');
    }
    return request;
  }
}

const baseConfig = { host: 'api.example.com', apiKey: 'KEY', secure: false };

function makeWsConnection(autoreconnect = true): Connection {
  return new Connection({ ...baseConfig, transport: 'ws' }, '0', autoreconnect);
}

function makeLpConnection(autoreconnect = true): Connection {
  return new Connection({ ...baseConfig, transport: 'lp' }, '0', autoreconnect);
}

async function openSocket(conn: Connection): Promise<FakeWebSocket> {
  const connecting = conn.connect();
  const socket = FakeWebSocket.latest();
  socket.emit('open');
  await connecting;
  return socket;
}

function removeBackoffJitter() {
  jest.spyOn(Math, 'random').mockReturnValue(0);
}

describe('Connection', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    FakeRequest.instances = [];
    Connection.setNetworkProviders(FakeWebSocket, FakeRequest);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Connection.setNetworkProviders(undefined, undefined);
  });

  test('rejects an unknown transport', () => {
    expect(
      () => new Connection({ ...baseConfig, transport: 'smoke' }, '0', true)
    ).toThrow('Unknown or invalid network transport');
  });

  test('reports the initialized transport', () => {
    expect(makeWsConnection().transport()).toBe('ws');
    expect(makeLpConnection().transport()).toBe('lp');
  });

  describe('websocket', () => {
    test('connects to the channels endpoint and notifies onOpen', async () => {
      const conn = makeWsConnection();
      const onOpen = jest.fn();
      conn.onOpen = onOpen;

      const socket = await openSocket(conn);

      expect(socket.url).toBe('ws://api.example.com/v0/channels?apikey=KEY');
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(conn.isConnected()).toBe(true);
    });

    test('uses wss when secure', async () => {
      const conn = new Connection(
        { ...baseConfig, secure: true, transport: 'ws' },
        '0',
        true
      );
      const socket = await openSocket(conn);
      expect(socket.url.startsWith('wss://')).toBe(true);
    });

    test('switches host when connect receives a new one', async () => {
      const conn = makeWsConnection();
      const connecting = conn.connect('other.example.com');
      FakeWebSocket.latest().emit('open');
      await connecting;
      expect(FakeWebSocket.latest().url).toContain('other.example.com');
    });

    test('rejects connect on socket error', async () => {
      const conn = makeWsConnection();
      const connecting = conn.connect();
      FakeWebSocket.latest().emit('error', { data: 'boom' });
      await expect(connecting).rejects.toEqual({ data: 'boom' });
    });

    test('delivers incoming messages and sends text', async () => {
      const conn = makeWsConnection();
      const onMessage = jest.fn();
      conn.onMessage = onMessage;
      const socket = await openSocket(conn);

      socket.emit('message', { data: '{"ctrl":{}}' });
      conn.sendText('hello');

      expect(onMessage).toHaveBeenCalledWith('{"ctrl":{}}');
      expect(socket.sent).toEqual(['hello']);
    });

    test('throws on send when not connected', () => {
      expect(() => makeWsConnection().sendText('hi')).toThrow(
        'Websocket is not connected'
      );
    });

    test('probes instead of reconnecting when already open', async () => {
      const conn = makeWsConnection();
      const socket = await openSocket(conn);

      await conn.connect();

      expect(FakeWebSocket.instances).toHaveLength(1);
      expect(socket.sent).toEqual(['1']);
    });

    test('force reconnect replaces the socket', async () => {
      const conn = makeWsConnection(false);
      await openSocket(conn);

      const reconnecting = conn.connect(null, true);
      FakeWebSocket.latest().emit('open');
      await reconnecting;

      expect(FakeWebSocket.instances).toHaveLength(2);
    });

    test('manual disconnect reports a user disconnect and does not reconnect', async () => {
      const conn = makeWsConnection();
      const onDisconnect = jest.fn();
      conn.onDisconnect = onDisconnect;
      const socket = await openSocket(conn);

      conn.disconnect();
      socket.emit('close');
      jest.advanceTimersByTime(BACKOFF_BASE * 100);

      expect(onDisconnect).toHaveBeenCalledWith(
        expect.objectContaining({ code: Connection.NETWORK_USER }),
        Connection.NETWORK_USER
      );
      expect(FakeWebSocket.instances).toHaveLength(1);
      expect(conn.isConnected()).toBe(false);
    });

    test('reconnects with exponential backoff after an unexpected close', async () => {
      removeBackoffJitter();
      const conn = makeWsConnection();
      const onDisconnect = jest.fn();
      const iterations: number[] = [];
      conn.onDisconnect = onDisconnect;
      conn.onAutoreconnectIteration = (timeout) => {
        iterations.push(timeout);
      };
      const socket = await openSocket(conn);

      socket.emit('close');
      expect(onDisconnect).toHaveBeenCalledWith(
        expect.objectContaining({ code: Connection.NETWORK_ERROR }),
        Connection.NETWORK_ERROR
      );
      expect(iterations).toEqual([BACKOFF_BASE]);

      jest.advanceTimersByTime(BACKOFF_BASE);
      expect(FakeWebSocket.instances).toHaveLength(2);
      expect(iterations).toEqual([BACKOFF_BASE, 0]);

      FakeWebSocket.latest().emit('close');
      expect(iterations).toEqual([BACKOFF_BASE, 0, BACKOFF_BASE * 2]);

      jest.advanceTimersByTime(BACKOFF_BASE * 2);
      expect(FakeWebSocket.instances).toHaveLength(3);
    });

    test('backoffReset restarts the delay sequence', async () => {
      removeBackoffJitter();
      const conn = makeWsConnection();
      const iterations: number[] = [];
      conn.onAutoreconnectIteration = (timeout) => {
        iterations.push(timeout);
      };
      const socket = await openSocket(conn);

      socket.emit('close');
      jest.advanceTimersByTime(BACKOFF_BASE);
      conn.backoffReset();
      FakeWebSocket.latest().emit('close');

      expect(iterations.filter((value) => value > 0)).toEqual([
        BACKOFF_BASE,
        BACKOFF_BASE,
      ]);
    });

    test('does not reconnect when autoreconnect is off', async () => {
      const conn = makeWsConnection(false);
      const socket = await openSocket(conn);

      socket.emit('close');
      jest.advanceTimersByTime(BACKOFF_BASE * 100);

      expect(FakeWebSocket.instances).toHaveLength(1);
    });

    test('reports a skipped attempt when closed during the wait', async () => {
      removeBackoffJitter();
      const conn = makeWsConnection();
      const iterations: number[] = [];
      conn.onAutoreconnectIteration = (timeout) => {
        iterations.push(timeout);
      };
      const socket = await openSocket(conn);

      socket.emit('close');
      conn.disconnect();
      jest.advanceTimersByTime(BACKOFF_BASE);

      expect(iterations).toEqual([BACKOFF_BASE]);
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
  });

  describe('long polling', () => {
    const handshake = JSON.stringify({ ctrl: { params: { sid: 'abc' } } });

    async function openPoller(conn: Connection): Promise<void> {
      const connecting = conn.connect();
      FakeRequest.latest().respond(201, handshake);
      await connecting;
    }

    test('connects to the lp endpoint and follows with a sid poll', async () => {
      const conn = makeLpConnection();
      const onOpen = jest.fn();
      conn.onOpen = onOpen;

      const connecting = conn.connect();
      const first = FakeRequest.latest();
      expect(first.url).toBe(
        'http://api.example.com/v0/channels/lp?apikey=KEY'
      );
      first.respond(201, handshake);
      await connecting;

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(FakeRequest.latest().url).toBe(
        'http://api.example.com/v0/channels/lp?apikey=KEY&sid=abc'
      );
      expect(conn.isConnected()).toBe(true);
    });

    test('delivers polled messages and keeps polling', async () => {
      const conn = makeLpConnection();
      const onMessage = jest.fn();
      conn.onMessage = onMessage;
      await openPoller(conn);

      const poll = FakeRequest.latest();
      const before = FakeRequest.instances.length;
      poll.respond(200, '{"data":{}}');

      expect(onMessage).toHaveBeenCalledWith('{"data":{}}');
      expect(FakeRequest.instances).toHaveLength(before + 1);
    });

    test('sends text with POST once a sid is known', async () => {
      const conn = makeLpConnection();
      await openPoller(conn);

      conn.sendText('payload');

      const sender = FakeRequest.latest();
      expect(sender.method).toBe('POST');
      expect(sender.url).toContain('&sid=abc');
      expect(sender.body).toBe('payload');
    });

    test('throws on send before connecting', () => {
      expect(() => makeLpConnection().sendText('x')).toThrow(
        'Long poller failed to connect'
      );
    });

    test('server error disconnects and schedules a reconnect', async () => {
      removeBackoffJitter();
      const conn = makeLpConnection();
      const onDisconnect = jest.fn();
      conn.onDisconnect = onDisconnect;
      await openPoller(conn);

      FakeRequest.latest().respond(0, '');

      expect(onDisconnect).toHaveBeenCalledWith(
        expect.objectContaining({ code: Connection.NETWORK_ERROR }),
        Connection.NETWORK_ERROR
      );
      expect(conn.isConnected()).toBe(false);

      const before = FakeRequest.instances.length;
      jest.advanceTimersByTime(BACKOFF_BASE);
      expect(FakeRequest.instances).toHaveLength(before + 1);
    });

    test('disconnect aborts the active poller', async () => {
      const conn = makeLpConnection();
      const onDisconnect = jest.fn();
      conn.onDisconnect = onDisconnect;
      await openPoller(conn);
      const poller = FakeRequest.latest();

      conn.disconnect();

      expect(poller.aborted).toBe(true);
      expect(conn.isConnected()).toBe(false);
      expect(onDisconnect).toHaveBeenCalledWith(
        expect.objectContaining({ code: Connection.NETWORK_USER }),
        Connection.NETWORK_USER
      );
    });
  });
});
