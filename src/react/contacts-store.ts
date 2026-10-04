import { ExternalStore, detachAll } from './external-store';
import { attach } from './multiplex';
import type { ContactPort, MeTopicPort } from './ports';

export interface Contact {
  readonly name: string;
  readonly topic: ContactPort;
  readonly public: unknown;
  readonly online: boolean;
  readonly unread: number;
  readonly touched?: Date;
}

function toContact(topic: ContactPort): Contact {
  return {
    name: topic.name,
    topic,
    public: topic.public,
    online: topic.online ?? false,
    unread: Math.max(0, (topic.seq ?? 0) - (topic.read ?? 0)),
    touched: topic.touched ?? undefined,
  };
}

function byMostRecent(a: Contact, b: Contact): number {
  return (b.touched?.getTime() ?? 0) - (a.touched?.getTime() ?? 0);
}

function collectContacts(me: MeTopicPort): readonly Contact[] {
  const contacts: Contact[] = [];
  me.contacts((topic) => {
    contacts.push(toContact(topic));
  });
  return contacts.sort(byMostRecent);
}

export class ContactsStore extends ExternalStore<readonly Contact[]> {
  readonly me: MeTopicPort;

  constructor(me: MeTopicPort) {
    super(collectContacts(me));
    this.me = me;
  }

  protected listen(): () => void {
    const rebuild = () => this.setSnapshot(collectContacts(this.me));
    rebuild();
    return detachAll([
      attach(this.me, 'onMetaSub', rebuild),
      attach(this.me, 'onSubsUpdated', rebuild),
      attach(this.me, 'onContactUpdate', rebuild),
      attach(this.me, 'onMetaDesc', rebuild),
      attach(this.me, 'onPres', rebuild),
    ]);
  }
}
