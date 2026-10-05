import type { KeyValueStore } from '../storage/key-value-adapter';

export class SyncStore implements KeyValueStore {
  readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  getAllKeys(): string[] {
    return [...this.data.keys()];
  }
}

export class AsyncStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItemCalls = 0;
  multiGetCalls = 0;

  async getItem(key: string): Promise<string | null> {
    this.getItemCalls += 1;
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.data.keys()];
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    this.multiGetCalls += 1;
    return keys.map((key) => [key, this.data.get(key) ?? null]);
  }
}

class FakeMMKVBase {
  readonly data = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.data.get(key);
  }

  set(key: string, value: boolean | string | number | ArrayBuffer): void {
    this.data.set(key, String(value));
  }

  getAllKeys(): string[] {
    return [...this.data.keys()];
  }

  clearAll(): void {
    this.data.clear();
  }
}

export class FakeMMKVv4 extends FakeMMKVBase {
  remove(key: string): boolean {
    return this.data.delete(key);
  }
}

export class FakeMMKVv3 extends FakeMMKVBase {
  delete(key: string): void {
    this.data.delete(key);
  }
}
