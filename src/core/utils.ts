import AccessMode from './access-mode';
import { DEL_CHAR, LOCAL_SEQID } from './config';

export interface SeqRange {
  low: number;
  hi?: number;
}

export interface BoundedSeqRange {
  low: number;
  hi: number;
}

const TIMESTAMP_KEYS = [
  'ts',
  'touched',
  'updated',
  'created',
  'when',
  'deleted',
  'expires',
];
const MIN_TIMESTAMP_LENGTH = 20;
const MAX_TIMESTAMP_LENGTH = 24;
const UNSAFE_MERGE_KEYS = ['__proto__', 'constructor', '_noForwarding'];
const RELATIVE_URL_BLOCKER = /^\s*([a-z][a-z0-9+.-]*:|\/\/)/im;

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0;
}

function padNumber(val: number, size = 2): string {
  return String(val).padStart(size, '0');
}

export function reviveTimestamp(key: string, val: unknown): unknown {
  if (
    typeof val === 'string' &&
    val.length >= MIN_TIMESTAMP_LENGTH &&
    val.length <= MAX_TIMESTAMP_LENGTH &&
    TIMESTAMP_KEYS.includes(key)
  ) {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return val;
}

export function jsonParseHelper(key: string, val: unknown): unknown {
  if (key === 'acs' && typeof val === 'object') {
    return new AccessMode(val);
  }
  return reviveTimestamp(key, val);
}

export function isUrlRelative(url: string | null | undefined): boolean {
  return !!url && !RELATIVE_URL_BLOCKER.test(url);
}

export function rfc3339DateString(d: unknown): string | undefined {
  if (!isValidDate(d)) {
    return undefined;
  }

  const millis = d.getUTCMilliseconds();
  return (
    d.getUTCFullYear() +
    '-' +
    padNumber(d.getUTCMonth() + 1) +
    '-' +
    padNumber(d.getUTCDate()) +
    'T' +
    padNumber(d.getUTCHours()) +
    ':' +
    padNumber(d.getUTCMinutes()) +
    ':' +
    padNumber(d.getUTCSeconds()) +
    (millis ? '.' + padNumber(millis, 3) : '') +
    'Z'
  );
}

function mergeValue(dst: unknown, src: unknown): unknown {
  if (typeof src !== 'object') {
    if (src === undefined) {
      return dst;
    }
    if (src === DEL_CHAR) {
      return undefined;
    }
    return src;
  }
  if (src === null) {
    return dst;
  }

  if (src instanceof Date && !isNaN(src.getTime())) {
    return !dst ||
      !(dst instanceof Date) ||
      isNaN(dst.getTime()) ||
      dst.getTime() < src.getTime()
      ? src
      : dst;
  }

  if (src instanceof AccessMode) {
    return new AccessMode(src);
  }

  if (src instanceof Array) {
    return src;
  }

  const target: object = isObjectLike(dst) ? dst : {};

  for (const prop of Object.keys(src)) {
    if (UNSAFE_MERGE_KEYS.includes(prop)) {
      continue;
    }
    try {
      Reflect.set(
        target,
        prop,
        mergeValue(Reflect.get(target, prop), Reflect.get(src, prop))
      );
    } catch (err) {
      console.warn('Error merging property:', prop, err);
    }
  }
  return target;
}

export function mergeObj<T = Record<string, unknown>>(
  dst: T | undefined,
  src: unknown
): T {
  return mergeValue(dst, src) as T;
}

export function mergeToCache<T>(
  cache: Record<string, T>,
  key: string,
  newval: unknown
): T {
  const merged = mergeObj(cache[key], newval);
  cache[key] = merged;
  return merged;
}

function shouldStripValue(value: unknown, key: string): boolean {
  return (
    key[0] === '_' ||
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (value instanceof Date && !isValidDate(value))
  );
}

export function simplify<T extends object>(obj: T): Partial<T> {
  Object.keys(obj).forEach((key) => {
    const value: unknown = Reflect.get(obj, key);
    if (shouldStripValue(value, key)) {
      Reflect.deleteProperty(obj, key);
    } else if (isObjectLike(value) && !(value instanceof Date)) {
      simplify(value);
      if (Object.getOwnPropertyNames(value).length === 0) {
        Reflect.deleteProperty(obj, key);
      }
    }
  });
  return obj;
}

export function normalizeArray(arr: unknown): string[] {
  let out: string[] = [];
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (item && typeof item === 'string') {
        const tag = item.trim().toLowerCase();
        if (tag.length > 1) {
          out.push(tag);
        }
      }
    }
    out = out.sort().filter((item, pos, ary) => !pos || item !== ary[pos - 1]);
  }
  if (out.length === 0) {
    out.push(DEL_CHAR);
  }
  return out;
}

function hasNumericLow(range: unknown): range is SeqRange {
  return isObjectLike(range) && typeof Reflect.get(range, 'low') === 'number';
}

function isUsableRange(range: SeqRange): boolean {
  return range.low < LOCAL_SEQID && range.low > 0;
}

function compareRanges(r1: SeqRange, r2: SeqRange): number {
  if (r1.low < r2.low) {
    return -1;
  }
  if (r1.low === r2.low) {
    return (r2.hi ?? 0) - (r1.hi ?? 0);
  }
  return 1;
}

function clipPendingRange(range: SeqRange, maxSeq: number): SeqRange {
  if (!range.hi || range.hi < LOCAL_SEQID) {
    return { ...range };
  }
  return { low: range.low, hi: maxSeq + 1 };
}

export function normalizeRanges(ranges: unknown, maxSeq: number): SeqRange[] {
  if (!Array.isArray(ranges)) {
    return [];
  }

  const candidates: SeqRange[] = ranges.filter(hasNumericLow);
  candidates.sort(compareRanges);

  const clipped = candidates
    .filter(isUsableRange)
    .map((range) => clipPendingRange(range, maxSeq));

  return clipped.reduce<SeqRange[]>((out, range) => {
    const prev = out[out.length - 1];
    if (prev && prev.hi !== undefined && range.low <= prev.hi) {
      prev.hi = Math.max(prev.hi, range.hi ?? range.low + 1);
    } else {
      out.push(range);
    }
    return out;
  }, []);
}

export function listToRanges(list: number[]): SeqRange[] {
  list.sort((a, b) => a - b);
  return list.reduce<SeqRange[]>((out, id) => {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push({ low: id });
    } else if (prev.hi ? id > prev.hi : id !== prev.low + 1) {
      out.push({ low: id });
    } else {
      prev.hi = prev.hi ? Math.max(prev.hi, id + 1) : id + 1;
    }
    return out;
  }, []);
}

export function clipOutRange(
  src: BoundedSeqRange,
  clip: BoundedSeqRange
): BoundedSeqRange[] {
  if (clip.hi <= src.low || clip.low >= src.hi) {
    return [src];
  }

  if (clip.low <= src.low) {
    if (clip.hi >= src.hi) {
      return [];
    }
    return [{ low: clip.hi, hi: src.hi }];
  }

  const result = [{ low: src.low, hi: clip.low }];
  if (clip.hi < src.hi) {
    result.push({ low: clip.hi, hi: src.hi });
  }

  return result;
}

export function clipInRange(
  src: BoundedSeqRange,
  clip: BoundedSeqRange
): BoundedSeqRange | null {
  if (clip.hi <= src.low || clip.low >= src.hi) {
    return null;
  }

  if (src.low >= clip.low && src.hi <= clip.hi) {
    return src;
  }

  return {
    low: Math.max(src.low, clip.low),
    hi: Math.min(src.hi, clip.hi),
  };
}
