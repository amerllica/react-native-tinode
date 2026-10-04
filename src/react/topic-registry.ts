import { DEFAULT_MESSAGES_PAGE, TOPIC_ME } from '../core/config';
import type { GetQuery } from '../core/types';
import { ExternalStore, detachAll, ignore } from './external-store';
import { attach } from './multiplex';
import type { TopicPort } from './ports';
import type { SessionStore } from './session-store';

export const LEAVE_DELAY_MS = 1_000;

export interface TopicState {
  readonly isSubscribed: boolean;
  readonly error?: unknown;
  readonly version: number;
}

function initialQuery(
  topic: TopicPort,
  pageSize: number
): GetQuery | undefined {
  const query = topic.startMetaQuery().withLaterDesc().withLaterSub();
  return topic.name === TOPIC_ME
    ? query.build()
    : query.withLaterData(pageSize).build();
}

export class TopicHandle extends ExternalStore<TopicState> {
  readonly topic: TopicPort;
  readonly #session: SessionStore;
  readonly #pageSize: number;
  #refs = 0;
  #pending: Promise<void> | null = null;
  #leaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(topic: TopicPort, session: SessionStore, pageSize: number) {
    super({ isSubscribed: topic.isSubscribed(), version: 0 });
    this.topic = topic;
    this.#session = session;
    this.#pageSize = pageSize;
  }

  get refCount(): number {
    return this.#refs;
  }

  acquire(): () => void {
    this.#refs += 1;
    this.#cancelLeave();
    this.ensureSubscribed();

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.#refs -= 1;
      if (this.#refs === 0) {
        this.#scheduleLeave();
      }
    };
  }

  ensureSubscribed(): void {
    if (this.#refs === 0 || this.#pending) {
      return;
    }
    if (this.topic.isSubscribed()) {
      this.refresh();
      return;
    }
    if (this.#session.client.isAuthenticated()) {
      this.subscribeTopic().catch(ignore);
    }
  }

  subscribeTopic(): Promise<void> {
    if (this.#pending) {
      return this.#pending;
    }
    this.#cancelLeave();
    this.#pending = this.topic
      .subscribe(initialQuery(this.topic, this.#pageSize))
      .then(
        () => this.refresh(),
        (error: unknown) => {
          this.refresh(error);
          throw error;
        }
      )
      .finally(() => {
        this.#pending = null;
        if (this.#refs === 0) {
          this.#scheduleLeave();
        }
      });
    return this.#pending;
  }

  async leaveTopic(unsub = false): Promise<void> {
    this.#cancelLeave();
    try {
      await this.topic.leave(unsub);
    } finally {
      this.refresh();
    }
  }

  refresh(error?: unknown): void {
    const current = this.getSnapshot();
    this.setSnapshot({
      isSubscribed: this.topic.isSubscribed(),
      error,
      version: current.version + 1,
    });
  }

  protected listen(): () => void {
    const bump = () => this.refresh(this.getSnapshot().error);
    bump();
    return detachAll([
      attach(this.topic, 'onMetaDesc', bump),
      attach(this.topic, 'onSubsUpdated', bump),
      attach(this.topic, 'onPres', bump),
    ]);
  }

  #scheduleLeave(): void {
    this.#cancelLeave();
    this.#leaveTimer = setTimeout(() => {
      this.#leaveTimer = null;
      if (this.#refs === 0 && this.topic.isSubscribed()) {
        this.leaveTopic(false).catch((error: unknown) => this.refresh(error));
      }
    }, LEAVE_DELAY_MS);
  }

  #cancelLeave(): void {
    if (this.#leaveTimer) {
      clearTimeout(this.#leaveTimer);
      this.#leaveTimer = null;
    }
  }
}

export class TopicRegistry {
  readonly #session: SessionStore;
  readonly #pageSize: number;
  readonly #handles = new Map<string, TopicHandle>();

  constructor(session: SessionStore, pageSize = DEFAULT_MESSAGES_PAGE) {
    this.#session = session;
    this.#pageSize = pageSize;
  }

  handle(name: string): TopicHandle {
    const existing = this.#handles.get(name);
    if (existing) {
      return existing;
    }
    const topic = this.#session.client.getTopic(name);
    if (!topic) {
      throw new Error(`Unknown topic "${name}"`);
    }
    const created = new TopicHandle(topic, this.#session, this.#pageSize);
    this.#handles.set(name, created);
    return created;
  }

  start(): () => void {
    let previous = this.#session.getSnapshot().status;
    const stopSession = this.#session.keepAlive();
    const unsubscribe = this.#session.subscribe(() => {
      const { status } = this.#session.getSnapshot();
      if (status === previous) {
        return;
      }
      previous = status;
      this.#handles.forEach((handle) =>
        status === 'authenticated'
          ? handle.ensureSubscribed()
          : handle.refresh()
      );
    });
    return detachAll([unsubscribe, stopSession]);
  }
}
