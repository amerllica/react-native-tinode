type EventHandler<E> = {
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
  onreadystatechange: EventHandler<unknown> | null;
  open(method: string, url: string, async: boolean): void;
  send(body?: string | null): void;
  abort(): void;
}
export type WebSocketProviderType = new (url: string) => WebSocketLike;
export type LongPollXHRProvider = new () => LongPollRequestLike;

interface UploadProgressEventLike {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}
export interface XHRLike {
  readyState: number;
  status: number;
  statusText: string;
  response: unknown;
  responseType: string;
  upload: {
    onprogress: EventHandler<UploadProgressEventLike> | null;
  };
  onload: EventHandler<unknown> | null;
  onerror: EventHandler<unknown> | null;
  onabort: EventHandler<unknown> | null;
  onprogress: EventHandler<{
    loaded: number;
  }> | null;
  open(method: string, url: string, async: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: FormData | null): void;
  abort(): void;
}
export type LargeFileXHRProvider = new () => XHRLike;

export type XHRProviderType = LongPollXHRProvider & LargeFileXHRProvider;
export interface TinodeNetwork {
  WebSocket?: WebSocketProviderType;
  XMLHttpRequest?: XHRProviderType;
}

export interface NetInfoStateLike {
  isConnected: boolean | null;
}
export interface NetInfoLike {
  addEventListener(listener: (state: NetInfoStateLike) => void): () => void;
}
