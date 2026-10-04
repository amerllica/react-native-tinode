export type Comparator<T> = (a: T, b: T) => number;

export type ForEachCallback<T> = (
  elem: T,
  prev: T | undefined,
  next: T | undefined,
  index: number
) => void;

export type FilterCallback<T> = (elem: T, index: number) => boolean;

interface NearestResult {
  idx: number;
  exact?: boolean;
}

function defaultComparator<T>(a: T, b: T): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export default class CBuffer<T> {
  #comparator: Comparator<T>;
  #unique: boolean;
  buffer: T[] = [];

  constructor(compare?: Comparator<T> | null, unique?: boolean) {
    this.#comparator = compare || defaultComparator;
    this.#unique = !!unique;
  }

  #findNearest(elem: T, arr: T[], exact: boolean): NearestResult {
    let start = 0;
    let end = arr.length - 1;
    let pivot = 0;
    let diff = 0;
    let found = false;

    while (start <= end) {
      pivot = ((start + end) / 2) | 0;
      diff = this.#comparator(arr[pivot] as T, elem);
      if (diff < 0) {
        start = pivot + 1;
      } else if (diff > 0) {
        end = pivot - 1;
      } else {
        found = true;
        break;
      }
    }
    if (found) {
      return { idx: pivot, exact: true };
    }
    if (exact) {
      return { idx: -1 };
    }
    return { idx: diff < 0 ? pivot + 1 : pivot };
  }

  #insertSorted(elem: T, arr: T[]): T[] {
    const found = this.#findNearest(elem, arr, false);
    const count = found.exact && this.#unique ? 1 : 0;
    arr.splice(found.idx, count, elem);
    return arr;
  }

  getAt(at: number): T | undefined {
    return this.buffer[at];
  }

  getLast(filter?: FilterCallback<T> | null): T | undefined {
    if (!filter) {
      return this.buffer[this.buffer.length - 1];
    }
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (filter(this.buffer[i] as T, i)) {
        return this.buffer[i];
      }
    }
    return undefined;
  }

  put(items: T[]): void;
  put(...items: T[]): void;
  put(...args: T[] | [T[]]): void {
    const first = args[0];
    const insert: T[] =
      args.length === 1 && Array.isArray(first) ? first : (args as T[]);
    for (const item of insert) {
      this.#insertSorted(item, this.buffer);
    }
  }

  delAt(at: number): T | undefined {
    const removed = this.buffer.splice(at | 0, 1);
    return removed[0];
  }

  delRange(since: number, before: number): T[] {
    return this.buffer.splice(since, before - since);
  }

  length(): number {
    return this.buffer.length;
  }

  reset(): void {
    this.buffer = [];
  }

  forEach(
    callback: ForEachCallback<T>,
    startIdx?: number,
    beforeIdx?: number,
    context?: unknown
  ): void {
    const start = Math.max(0, (startIdx ?? 0) | 0);
    const before = Math.min(
      beforeIdx || this.buffer.length,
      this.buffer.length
    );

    for (let i = start; i < before; i++) {
      callback.call(
        context,
        this.buffer[i] as T,
        i > start ? this.buffer[i - 1] : undefined,
        i < before - 1 ? this.buffer[i + 1] : undefined,
        i
      );
    }
  }

  find(elem: T, nearest?: boolean): number {
    const { idx } = this.#findNearest(elem, this.buffer, !nearest);
    return idx;
  }

  filter(callback: FilterCallback<T>, context?: unknown): void {
    let count = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const elem = this.buffer[i] as T;
      if (callback.call(context, elem, i)) {
        this.buffer[count] = elem;
        count++;
      }
    }

    this.buffer.splice(count);
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}
