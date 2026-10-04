import * as Const from './config';
import Topic from './topic';
import type { TopicCallbacks } from './topic';
import type { CtrlMessage, SetParams, TopicSubscription } from './types';
import { mergeToCache } from './utils';

export type FoundContactCallback = (
  contact: TopicSubscription,
  key: string,
  all: Record<string, TopicSubscription>
) => void;

export default class TopicFnd extends Topic {
  _contacts: Record<string, TopicSubscription> = {};

  constructor(callbacks?: TopicCallbacks) {
    super(Const.TOPIC_FND, callbacks);
  }

  override _processMetaSubs(subs: TopicSubscription[]): void {
    let updateCount = Object.getOwnPropertyNames(this._contacts).length;
    this._contacts = {};
    for (const item of subs) {
      const indexBy = item.topic ? item.topic : item.user;
      if (!indexBy) {
        continue;
      }

      const sub = mergeToCache(this._contacts, indexBy, item);
      updateCount++;

      if (this.onMetaSub) {
        this.onMetaSub(sub);
      }
    }

    if (updateCount > 0 && this.onSubsUpdated) {
      this.onSubsUpdated(Object.keys(this._contacts));
    }
  }

  override publish(): Promise<never> {
    return Promise.reject(new Error("Publishing to 'fnd' is not supported"));
  }

  override setMeta(params: SetParams): Promise<CtrlMessage> {
    return super.setMeta(params).then((ctrl) => {
      if (Object.keys(this._contacts).length > 0) {
        this._contacts = {};
        if (this.onSubsUpdated) {
          this.onSubsUpdated([]);
        }
      }
      return ctrl;
    });
  }

  checkTagUniqueness(tag: string, caller: string): Promise<boolean> {
    return this.subscribe()
      .then(() =>
        this.setMeta({
          desc: {
            public: tag,
          },
        })
      )
      .then(() => this.getMeta(this.startMetaQuery().withTags().build()))
      .then((meta) => {
        const tags = 'tags' in meta ? meta.tags : undefined;
        if (!Array.isArray(tags) || tags.length === 0) {
          return true;
        }
        return tags.filter((t) => t !== caller).length === 0;
      });
  }

  contacts(callback?: FoundContactCallback, context?: unknown): void {
    const cb = callback || this.onMetaSub;
    if (cb) {
      for (const idx in this._contacts) {
        const contact = this._contacts[idx];
        if (contact) {
          cb.call(context, contact, idx, this._contacts);
        }
      }
    }
  }
}
