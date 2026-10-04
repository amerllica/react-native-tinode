import { LOCAL_SEQID } from '../core/config';
import type { Message } from '../core/types';
import { ExternalStore, detachAll } from './external-store';
import { attach } from './multiplex';
import type { MessageContent, TopicPort } from './ports';

export interface MessagesState {
  readonly messages: readonly Message[];
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly error?: unknown;
}

const RECEIPT_EVENTS = new Set(['read', 'recv']);

function collectMessages(topic: TopicPort): Message[] {
  const messages: Message[] = [];
  topic.messages((msg) => {
    messages.push(msg);
  });
  return messages;
}

function oldestLoadedSeq(topic: TopicPort): number {
  return topic.minMsgSeq() || LOCAL_SEQID;
}

function hasOlderMessages(topic: TopicPort): boolean {
  return topic.msgHasMoreMessages(0, oldestLoadedSeq(topic), false).length > 0;
}

export class MessagesStore extends ExternalStore<MessagesState> {
  readonly topic: TopicPort;
  readonly pageSize: number;

  constructor(topic: TopicPort, pageSize: number) {
    super({
      messages: collectMessages(topic),
      hasMore: hasOlderMessages(topic),
      loading: false,
    });
    this.topic = topic;
    this.pageSize = pageSize;
  }

  async loadMore(): Promise<void> {
    const { loading, hasMore } = this.getSnapshot();
    if (loading || !hasMore || !this.topic.isSubscribed()) {
      return;
    }
    this.#rebuild({ loading: true, error: undefined });
    try {
      await this.topic.getMessagesPage(
        this.pageSize,
        null,
        0,
        oldestLoadedSeq(this.topic),
        false
      );
      this.#rebuild({ loading: false });
    } catch (error) {
      this.#rebuild({ loading: false, error });
    }
  }

  async send(content: MessageContent): Promise<void> {
    const pub = this.topic.createMessage(content, false);
    await this.topic.publishDraft(pub);
  }

  status(msg: Message): number {
    return this.topic.msgStatus(msg, false);
  }

  markRead(seq?: number): void {
    if (seq !== undefined && (seq <= 0 || seq >= LOCAL_SEQID)) {
      return;
    }
    this.topic.noteRead(seq);
  }

  protected listen(): () => void {
    const rebuild = () => this.#rebuild({});
    rebuild();
    return detachAll([
      attach(this.topic, 'onData', rebuild),
      attach(this.topic, 'onAllMessagesReceived', rebuild),
      attach(this.topic, 'onInfo', (info) => {
        if (RECEIPT_EVENTS.has(info.what)) {
          rebuild();
        }
      }),
    ]);
  }

  #rebuild(patch: Partial<Pick<MessagesState, 'loading' | 'error'>>): void {
    const current = this.getSnapshot();
    this.setSnapshot({
      loading: patch.loading ?? current.loading,
      error: 'error' in patch ? patch.error : current.error,
      messages: collectMessages(this.topic),
      hasMore: hasOlderMessages(this.topic),
    });
  }
}
