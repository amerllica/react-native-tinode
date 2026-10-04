import type Topic from './topic';
import { listToRanges, normalizeRanges } from './utils';
import type { SeqRange } from './utils';

export interface GetOptsType {
  ims?: Date;
  limit?: number;
}

export interface GetSubType extends GetOptsType {
  user?: string;
  topic?: string;
}

export interface GetDataType {
  since?: number;
  before?: number;
  limit?: number;
  ranges?: SeqRange[];
}

export interface GetDelType {
  since?: number;
  limit?: number;
}

export interface GetQuery {
  what?: string;
  desc?: GetOptsType;
  sub?: GetSubType;
  data?: GetDataType;
  del?: GetDelType;
}

export interface MetaWhat {
  data?: GetDataType;
  sub?: GetSubType;
  desc?: GetOptsType;
  tags?: true;
  cred?: true;
  aux?: true;
  del?: GetDelType;
}

export type MetaWhatKey = keyof MetaWhat;

function hasOwnProperties(value: object): boolean {
  return Object.getOwnPropertyNames(value).length > 0;
}

export default class MetaGetBuilder {
  topic: Topic;
  what: MetaWhat = {};

  constructor(parent: Topic) {
    this.topic = parent;
  }

  #get_desc_ims(): Date | undefined {
    return this.topic._deleted ? undefined : this.topic.updated;
  }

  #get_subs_ims(): Date | undefined {
    if (this.topic.isP2PType()) {
      return this.#get_desc_ims();
    }
    return this.topic._deleted ? undefined : this.topic._lastSubsUpdate;
  }

  withData(since?: number, before?: number, limit?: number): this {
    this.what.data = { since, before, limit };
    return this;
  }

  withLaterData(limit?: number): this {
    return this.withData(
      this.topic._maxSeq > 0 ? this.topic._maxSeq + 1 : undefined,
      undefined,
      limit
    );
  }

  withDataRanges(ranges: SeqRange[], limit?: number): this {
    this.what.data = {
      ranges: normalizeRanges(ranges, this.topic._maxSeq),
      limit,
    };
    return this;
  }

  withDataList(list: number[]): this {
    return this.withDataRanges(listToRanges(list));
  }

  withEarlierData(limit?: number): this {
    return this.withData(
      undefined,
      this.topic._minSeq > 0 ? this.topic._minSeq : undefined,
      limit
    );
  }

  withDesc(ims?: Date): this {
    this.what.desc = { ims };
    return this;
  }

  withLaterDesc(): this {
    return this.withDesc(this.#get_desc_ims());
  }

  withSub(ims?: Date, limit?: number, userOrTopic?: string): this {
    const opts: GetSubType = { ims, limit };
    if (this.topic.getType() === 'me') {
      opts.topic = userOrTopic;
    } else {
      opts.user = userOrTopic;
    }
    this.what.sub = opts;
    return this;
  }

  withOneSub(ims?: Date, userOrTopic?: string): this {
    return this.withSub(ims, undefined, userOrTopic);
  }

  withLaterOneSub(userOrTopic?: string): this {
    return this.withOneSub(this.topic._lastSubsUpdate, userOrTopic);
  }

  withLaterSub(limit?: number): this {
    return this.withSub(this.#get_subs_ims(), limit);
  }

  withTags(): this {
    this.what.tags = true;
    return this;
  }

  withCred(): this {
    if (this.topic.getType() === 'me') {
      this.what.cred = true;
    } else {
      this.topic._tinode.logger(
        'ERROR: Invalid topic type for MetaGetBuilder:withCreds',
        this.topic.getType()
      );
    }
    return this;
  }

  withAux(): this {
    this.what.aux = true;
    return this;
  }

  withDel(since?: number, limit?: number): this {
    if (since || limit) {
      this.what.del = { since, limit };
    }
    return this;
  }

  withLaterDel(limit?: number): this {
    return this.withDel(
      this.topic._maxSeq > 0 ? this.topic._maxDel + 1 : undefined,
      limit
    );
  }

  extract<K extends MetaWhatKey>(what: K): MetaWhat[K] {
    return this.what[what];
  }

  build(): GetQuery | undefined {
    const what: string[] = [];
    const params: GetQuery = {};
    const { data, sub, desc, tags, cred, aux, del } = this.what;

    if (data) {
      what.push('data');
      if (hasOwnProperties(data)) {
        params.data = data;
      }
    }
    if (sub) {
      what.push('sub');
      if (hasOwnProperties(sub)) {
        params.sub = sub;
      }
    }
    if (desc) {
      what.push('desc');
      if (hasOwnProperties(desc)) {
        params.desc = desc;
      }
    }
    if (tags) {
      what.push('tags');
    }
    if (cred) {
      what.push('cred');
    }
    if (aux) {
      what.push('aux');
    }
    if (del) {
      what.push('del');
      if (hasOwnProperties(del)) {
        params.del = del;
      }
    }

    if (what.length === 0) {
      return undefined;
    }
    params.what = what.join(' ');
    return params;
  }
}
