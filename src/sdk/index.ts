/// <reference path="./tinode-sdk.d.ts" />
import * as sdk from 'tinode-sdk';
import type {
  AccessMode as AccessModeClass,
  CommError,
  Drafty as DraftyClass,
  IndexedDBAdapter as IndexedDBAdapterClass,
  KeyValueAdapter as KeyValueAdapterClass,
  KeyValueStore,
  MemoryAdapter as MemoryAdapterClass,
  MMKVLike,
  TheCard as TheCardClass,
  Tinode as TinodeClass,
} from './types';

export type * from './types';

export const Tinode: typeof TinodeClass = sdk.Tinode;
export type Tinode = TinodeClass;
export const Drafty: typeof DraftyClass = sdk.Drafty;
export type Drafty = DraftyClass;
export const TheCard: typeof TheCardClass = sdk.TheCard;
export type TheCard = TheCardClass;
export const AccessMode: typeof AccessModeClass = sdk.AccessMode;
export type AccessMode = AccessModeClass;
export const MemoryAdapter: typeof MemoryAdapterClass = sdk.MemoryAdapter;
export type MemoryAdapter = MemoryAdapterClass;
export const IndexedDBAdapter: typeof IndexedDBAdapterClass =
  sdk.IndexedDBAdapter;
export type IndexedDBAdapter = IndexedDBAdapterClass;
export const KeyValueAdapter: typeof KeyValueAdapterClass = sdk.KeyValueAdapter;
export type KeyValueAdapter = KeyValueAdapterClass;

export function fromMMKV(mmkv: MMKVLike): KeyValueStore {
  return sdk.fromMMKV(mmkv);
}

export const MESSAGE_STATUS_NONE = Tinode.MESSAGE_STATUS_NONE;
export const MESSAGE_STATUS_QUEUED = Tinode.MESSAGE_STATUS_QUEUED;
export const MESSAGE_STATUS_SENDING = Tinode.MESSAGE_STATUS_SENDING;
export const MESSAGE_STATUS_FAILED = Tinode.MESSAGE_STATUS_FAILED;
export const MESSAGE_STATUS_FATAL = Tinode.MESSAGE_STATUS_FATAL;
export const MESSAGE_STATUS_SENT = Tinode.MESSAGE_STATUS_SENT;
export const MESSAGE_STATUS_RECEIVED = Tinode.MESSAGE_STATUS_RECEIVED;
export const MESSAGE_STATUS_READ = Tinode.MESSAGE_STATUS_READ;
export const MESSAGE_STATUS_TO_ME = Tinode.MESSAGE_STATUS_TO_ME;
export const DEL_CHAR = Tinode.DEL_CHAR;

export function isCommError(err: unknown): err is CommError {
  return (
    err instanceof Error &&
    err.name === 'CommError' &&
    typeof Reflect.get(err, 'code') === 'number'
  );
}
