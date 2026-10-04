import IndexedDBAdapter from './indexeddb-adapter';
import type { StorageAdapter } from './storage-adapter';

export function resolveStorageAdapter(
  persist: boolean,
  custom?: StorageAdapter | null
): StorageAdapter | null {
  if (custom) {
    return custom;
  }
  if (persist && IndexedDBAdapter.isSupported()) {
    return new IndexedDBAdapter();
  }
  return null;
}
