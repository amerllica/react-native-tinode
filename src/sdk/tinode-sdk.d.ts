declare module 'tinode-sdk' {
  export const Tinode: typeof import('./types').Tinode;
  export const Drafty: typeof import('./types').Drafty;
  export const TheCard: typeof import('./types').TheCard;
  export const AccessMode: typeof import('./types').AccessMode;
  export const MemoryAdapter: typeof import('./types').MemoryAdapter;
  export const IndexedDBAdapter: typeof import('./types').IndexedDBAdapter;
  export const KeyValueAdapter: typeof import('./types').KeyValueAdapter;
  export function fromMMKV(
    mmkv: import('./types').MMKVLike
  ): import('./types').KeyValueStore;
}
