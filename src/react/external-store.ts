export const ignore = () => {};

export abstract class ExternalStore<S> {
  #snapshot: S;
  #listeners = new Set<() => void>();
  #stopListening: (() => void) | null = null;

  protected constructor(initial: S) {
    this.#snapshot = initial;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    if (this.#listeners.size === 1) {
      this.#stopListening = this.listen();
    }
    return () => {
      if (!this.#listeners.delete(listener) || this.#listeners.size > 0) {
        return;
      }
      this.#stopListening?.();
      this.#stopListening = null;
    };
  };

  readonly getSnapshot = (): S => this.#snapshot;

  keepAlive(): () => void {
    const hold = () => {};
    return this.subscribe(hold);
  }

  protected setSnapshot(next: S): void {
    if (Object.is(next, this.#snapshot)) {
      return;
    }
    this.#snapshot = next;
    for (const listener of [...this.#listeners]) {
      listener();
    }
  }

  protected abstract listen(): () => void;
}

export function detachAll(detachers: ReadonlyArray<() => void>): () => void {
  return () => {
    for (const detach of detachers) {
      detach();
    }
  };
}
