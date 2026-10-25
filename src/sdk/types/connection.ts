import type { LongPollXHRProvider, WebSocketProviderType } from './network';

export declare class CommError extends Error {
  code: number;
  constructor(message: string, code: number);
}

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
export declare class Connection {
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
    xhrProvider?: LongPollXHRProvider
  ): void;
  static set logger(l: ConnectionLogger);
  transport(): ConnectionTransport | undefined;
  probe(): void;
  backoffReset(): void;
  retryNow(): void;
}
