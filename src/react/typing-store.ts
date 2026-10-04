import { ExternalStore, detachAll } from './external-store';
import { attach } from './multiplex';
import type { TopicPort } from './ports';

export const TYPING_EXPIRY_MS = 5_000;
export const KEYPRESS_THROTTLE_MS = 3_000;

const TYPING_EVENT = 'kp';

export interface TypingState {
  readonly typingUsers: readonly string[];
}

export class TypingStore extends ExternalStore<TypingState> {
  readonly topic: TopicPort;
  readonly #isMe: (uid: string) => boolean;
  readonly #expiresAt = new Map<string, number>();
  #expiryTimer: ReturnType<typeof setTimeout> | null = null;
  #lastKeyPressAt = Number.NEGATIVE_INFINITY;

  constructor(topic: TopicPort, isMe: (uid: string) => boolean) {
    super({ typingUsers: [] });
    this.topic = topic;
    this.#isMe = isMe;
  }

  notifyTyping(): void {
    const now = Date.now();
    if (now - this.#lastKeyPressAt < KEYPRESS_THROTTLE_MS) {
      return;
    }
    this.#lastKeyPressAt = now;
    this.topic.noteKeyPress();
  }

  protected listen(): () => void {
    return detachAll([
      attach(this.topic, 'onInfo', (info) => {
        if (info.what === TYPING_EVENT && info.from && !this.#isMe(info.from)) {
          this.#markTyping(info.from);
        }
      }),
      attach(this.topic, 'onData', (msg) => {
        if (msg?.from && this.#expiresAt.delete(msg.from)) {
          this.#publish();
        }
      }),
      () => this.#reset(),
    ]);
  }

  #markTyping(uid: string): void {
    this.#expiresAt.set(uid, Date.now() + TYPING_EXPIRY_MS);
    this.#publish();
  }

  #expire(): void {
    const now = Date.now();
    for (const [uid, expiresAt] of this.#expiresAt) {
      if (expiresAt <= now) {
        this.#expiresAt.delete(uid);
      }
    }
    this.#publish();
  }

  #publish(): void {
    this.#scheduleExpiry();
    const typingUsers = [...this.#expiresAt.keys()];
    const current = this.getSnapshot().typingUsers;
    const unchanged =
      typingUsers.length === current.length &&
      typingUsers.every((uid, index) => current[index] === uid);
    if (!unchanged) {
      this.setSnapshot({ typingUsers });
    }
  }

  #scheduleExpiry(): void {
    if (this.#expiryTimer) {
      clearTimeout(this.#expiryTimer);
      this.#expiryTimer = null;
    }
    if (this.#expiresAt.size === 0) {
      return;
    }
    const nextExpiry = Math.min(...this.#expiresAt.values());
    this.#expiryTimer = setTimeout(
      () => this.#expire(),
      Math.max(0, nextExpiry - Date.now())
    );
  }

  #reset(): void {
    this.#expiresAt.clear();
    this.#publish();
  }
}
