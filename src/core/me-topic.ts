import AccessMode from './access-mode';
import * as Const from './config';
import Topic from './topic';
import type { TopicCallbacks } from './topic';
import type {
  Credential,
  CtrlMessage,
  PresMessage,
  PresWhat,
  TopicDesc,
  TopicSubscription,
} from './types';
import { mergeObj } from './utils';

export type ContactCallback = (contact: Topic, key: string) => void;

export interface TopicMeCallbacks extends TopicCallbacks {
  onContactUpdate?: (what: PresWhat, cont: Topic) => void;
}

export default class TopicMe extends Topic {
  onContactUpdate: TopicMeCallbacks['onContactUpdate'];

  constructor(callbacks?: TopicMeCallbacks) {
    super(Const.TOPIC_ME, callbacks);
    this.onContactUpdate = callbacks?.onContactUpdate;
  }

  override _processMetaDesc(desc: TopicDesc): void {
    const turnOff =
      desc.acs && !desc.acs.isPresencer() && this.acs && this.acs.isPresencer();

    mergeObj(this, desc);
    this._tinode._db.updTopic(this);
    const myUID = this._tinode._myUID;
    if (myUID) {
      this._updateCachedUser(myUID, desc);
    }

    if (turnOff) {
      this._tinode.mapTopics((cont) => {
        if (cont.online) {
          cont.online = false;
          cont.seen = Object.assign(cont.seen || {}, {
            when: new Date(),
          });
          this._refreshContact('off', cont);
        }
      });
    }

    if (this.onMetaDesc) {
      this.onMetaDesc(this);
    }
  }

  override _processMetaSubs(subs: TopicSubscription[]): void {
    let updateCount = 0;
    subs.forEach((sub) => {
      const topicName = sub.topic;
      if (
        !topicName ||
        topicName === Const.TOPIC_FND ||
        topicName === Const.TOPIC_ME
      ) {
        return;
      }
      sub.online = !!sub.online;

      let cont: TopicSubscription;
      if (sub.deleted) {
        cont = sub;
        this._tinode.cacheRemTopic(topicName);
        this._tinode._db.remTopic(topicName);
      } else {
        if (typeof sub.seq !== 'undefined') {
          sub.seq = sub.seq | 0;
          sub.recv = (sub.recv ?? 0) | 0;
          sub.read = (sub.read ?? 0) | 0;
          sub.unread = sub.seq - sub.read;
        }

        const topic = this._tinode.getTopic(topicName);
        if (!topic) {
          return;
        }
        if (topic._new) {
          delete topic._new;
        }

        const merged = mergeObj(topic, sub);
        cont = merged;
        this._tinode._db.updTopic(merged);

        if (Topic.isP2PTopicName(topicName)) {
          this._cachePutUser(topicName, merged);
          this._tinode._db.updUser(topicName, merged.public);
        }
        if (!sub._noForwarding) {
          sub._noForwarding = true;
          topic._processMetaDesc(sub);
        }
      }

      updateCount++;

      if (this.onMetaSub) {
        this.onMetaSub(cont);
      }
    });

    if (this.onSubsUpdated && updateCount > 0) {
      const keys: string[] = [];
      subs.forEach((s) => {
        if (s.topic) {
          keys.push(s.topic);
        }
      });
      this.onSubsUpdated(keys, updateCount);
    }
  }

  override _processMetaCreds(creds: Credential[], upd?: boolean): void {
    const first: unknown = creds[0];
    if (creds.length === 1 && first === Const.DEL_CHAR) {
      creds = [];
    }
    if (upd) {
      creds.forEach((cr) => {
        if (cr.val) {
          let idx = this._credentials.findIndex(
            (el) => el.meth === cr.meth && el.val === cr.val
          );
          if (idx < 0) {
            if (!cr.done) {
              idx = this._credentials.findIndex(
                (el) => el.meth === cr.meth && !el.done
              );
              if (idx >= 0) {
                this._credentials.splice(idx, 1);
              }
            }
            this._credentials.push(cr);
          } else {
            const found = this._credentials[idx];
            if (found) {
              found.done = cr.done;
            }
          }
        } else if (cr.resp) {
          const found = this._credentials.find(
            (el) => el.meth === cr.meth && !el.done
          );
          if (found) {
            found.done = true;
          }
        }
      });
    } else {
      this._credentials = creds;
    }
    if (this.onCredsUpdated) {
      this.onCredsUpdated(this._credentials);
    }
  }

  override _routePres(pres: PresMessage): void {
    if (pres.what === 'term') {
      this._resetSub();
      return;
    }

    if (pres.what === 'upd' && pres.src === Const.TOPIC_ME) {
      this.getMeta(this.startMetaQuery().withDesc().build());
      return;
    }

    const cont = this._tinode.cacheGetTopic(pres.src);
    if (cont) {
      switch (pres.what) {
        case 'on':
          cont.online = true;
          break;
        case 'off':
          if (cont.online) {
            cont.online = false;
            cont.seen = Object.assign(cont.seen || {}, {
              when: new Date(),
            });
          }
          break;
        case 'msg':
          cont._updateReceived(pres.seq, pres.act);
          break;
        case 'upd':
          this.getMeta(this.startMetaQuery().withLaterOneSub(pres.src).build());
          break;
        case 'acs':
          if (!pres.tgt) {
            if (cont.acs) {
              cont.acs.updateAll(pres.dacs);
            } else {
              cont.acs = new AccessMode().updateAll(pres.dacs);
            }
            cont.touched = new Date();
          }
          break;
        case 'ua':
          cont.seen = {
            when: new Date(),
            ua: pres.ua,
          };
          break;
        case 'recv': {
          const seq = (pres.seq ?? 0) | 0;
          pres.seq = seq;
          cont.recv = cont.recv ? Math.max(cont.recv, seq) : seq;
          break;
        }
        case 'read': {
          const seq = (pres.seq ?? 0) | 0;
          pres.seq = seq;
          cont.read = cont.read ? Math.max(cont.read, seq) : seq;
          cont.recv = cont.recv ? Math.max(cont.read, cont.recv) : cont.recv;
          cont.unread = cont.seq - cont.read;
          break;
        }
        case 'gone':
          if (pres.src) {
            this._tinode.cacheRemTopic(pres.src);
            if (!cont._deleted) {
              cont._deleted = true;
              cont._attached = false;
              this._tinode._db.markTopicAsDeleted(pres.src, true);
            } else {
              this._tinode._db.remTopic(pres.src);
            }
          }
          break;
        case 'del':
          break;
        default:
          this._tinode.logger(
            "INFO: Unsupported presence update in 'me'",
            pres.what
          );
      }

      this._refreshContact(pres.what, cont);
    } else if (pres.what === 'acs') {
      const acs = new AccessMode(pres.dacs);
      if (!acs || acs.mode === AccessMode._INVALID) {
        this._tinode.logger(
          'ERROR: Invalid access mode update',
          pres.src,
          pres.dacs
        );
        return;
      } else if (acs.mode === AccessMode._NONE) {
        this._tinode.logger(
          'WARNING: Removing non-existent subscription',
          pres.src,
          pres.dacs
        );
        return;
      } else if (pres.src) {
        this.getMeta(
          this.startMetaQuery().withOneSub(undefined, pres.src).build()
        );
        const dummy = this._tinode.getTopic(pres.src);
        if (dummy) {
          dummy.topic = pres.src;
          dummy.online = false;
          dummy.acs = acs;
          this._tinode._db.updTopic(dummy);
        }
      }
    } else if (pres.what === 'tags') {
      this.getMeta(this.startMetaQuery().withTags().build());
    } else if (pres.what === 'msg' && pres.src) {
      this.getMeta(
        this.startMetaQuery().withOneSub(undefined, pres.src).build()
      );
      const dummy = this._tinode.getTopic(pres.src);
      if (dummy) {
        dummy._deleted = false;
        this._tinode._db.updTopic(dummy);
      }
    }

    if (this.onPres) {
      this.onPres(pres);
    }
  }

  _refreshContact(what: PresWhat, cont: Topic): void {
    if (this.onContactUpdate) {
      this.onContactUpdate(what, cont);
    }
  }

  override publish(): Promise<never> {
    return Promise.reject(new Error("Publishing to 'me' is not supported"));
  }

  delCredential(method: string, value: string): Promise<CtrlMessage> {
    if (!this._attached) {
      return Promise.reject(
        new Error("Cannot delete credential in inactive 'me' topic")
      );
    }
    return this._tinode.delCredential(method, value).then((ctrl) => {
      const index = this._credentials.findIndex(
        (el) => el.meth === method && el.val === value
      );
      if (index > -1) {
        this._credentials.splice(index, 1);
      }
      if (this.onCredsUpdated) {
        this.onCredsUpdated(this._credentials);
      }
      return ctrl;
    });
  }

  contacts(
    callback: ContactCallback,
    filter?: ((contact: Topic) => boolean) | null,
    context?: unknown
  ): void {
    this._tinode.mapTopics((c, idx) => {
      if (c.isCommType() && (!filter || filter(c))) {
        callback.call(context, c, idx);
      }
    });
  }

  getContact(name: string): Topic | undefined {
    return this._tinode.cacheGetTopic(name);
  }

  override getAccessMode(): AccessMode;
  override getAccessMode(name?: string): AccessMode | null;
  override getAccessMode(name?: string): AccessMode | null {
    if (name) {
      const cont = this._tinode.cacheGetTopic(name);
      return cont ? cont.acs : null;
    }
    return this.acs;
  }

  override isArchived(name?: string): boolean {
    const cont = this._tinode.cacheGetTopic(name);
    return !!cont?.private?.arch;
  }

  getCredentials(): Credential[] {
    return this._credentials;
  }

  override pinTopic(
    topic: string,
    pin?: boolean
  ): Promise<CtrlMessage | string[]> {
    if (!this._attached) {
      return Promise.reject(
        new Error("Cannot pin topic in inactive 'me' topic")
      );
    }
    if (!Topic.isCommTopicName(topic)) {
      return Promise.reject(new Error('Invalid topic to pin'));
    }

    const tpin = Array.isArray(this.private?.tpin) ? this.private.tpin : [];
    const found = tpin.includes(topic);
    if ((pin && found) || (!pin && !found)) {
      return Promise.resolve(tpin);
    }

    if (pin) {
      tpin.unshift(topic);
    } else {
      tpin.splice(tpin.indexOf(topic), 1);
    }

    return this.setMeta({
      desc: {
        private: {
          tpin: tpin.length > 0 ? tpin : Const.DEL_CHAR,
        },
      },
    });
  }

  override pinnedTopicRank(topic: string): number {
    const tpin = this.private?.tpin;
    if (!tpin) {
      return 0;
    }
    const idx = tpin.indexOf(topic);
    return idx < 0 ? 0 : tpin.length - idx;
  }
}
