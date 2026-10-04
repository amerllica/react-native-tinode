import type { CardData } from './the-card';
import { splitGraphemes } from './graphemes';
import type { GraphemeSegment } from './graphemes';

export type DraftyEntityType =
  'AU' | 'BN' | 'EX' | 'HT' | 'IM' | 'LN' | 'MN' | 'TC' | 'VC' | 'VD';

export type DraftyStyleType =
  | DraftyEntityType
  | 'BR'
  | 'CO'
  | 'DL'
  | 'EM'
  | 'FM'
  | 'HD'
  | 'HL'
  | 'QQ'
  | 'RW'
  | 'ST';

export type DraftyJsonObject = { readonly [key: string]: unknown };

export interface DraftyEntData extends CardData {
  act?: string;
  aonly?: boolean;
  duration?: number;
  height?: number;
  incoming?: boolean;
  mime?: string;
  name?: string;
  premime?: string;
  preref?: string;
  preview?: string;
  ref?: string;
  size?: number;
  state?: string;
  title?: string;
  url?: string;
  val?: string | DraftyJsonObject;
  vc?: boolean;
  width?: number;
  _tempPreview?: string;
  _processing?: boolean;
}

export interface DraftyFmt {
  at?: number;
  len?: number;
  tp?: DraftyStyleType;
  key?: number;
}

export interface DraftyEnt {
  tp: DraftyStyleType;
  data?: DraftyEntData;
}

export interface DraftyDoc {
  txt?: string;
  fmt?: DraftyFmt[];
  ent?: DraftyEnt[];
}

export type DraftySource = DraftyDoc | string | null | undefined;

export interface DraftyNode {
  type?: DraftyStyleType;
  text?: string;
  data?: DraftyEntData;
  key?: number;
  att?: boolean;
  children?: DraftyNode[] | null;
  parent?: DraftyNode;
}

export type DraftyFormatter<R> = (
  style: DraftyStyleType | undefined,
  data: DraftyEntData | undefined,
  values: (R | string)[] | null,
  index: number,
  stack: DraftyStyleType[] | undefined
) => R | null | undefined;

export type DraftyEntityCallback = (
  data: DraftyEntData | undefined,
  index: number,
  tp: DraftyStyleType
) => unknown;

export type DraftyStyleCallback = (
  tp: DraftyStyleType | undefined,
  at: number | undefined,
  len: number | undefined,
  key: number | undefined,
  index: number
) => unknown;

export type DraftyLogger = (message: string, ...args: unknown[]) => void;

export type DraftyAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface ImageDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  width?: number;
  height?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<string>;
}

export interface VideoDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  preref?: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<[string | undefined, string | undefined]>;
}

export interface AudioDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  duration?: number;
  preview?: string;
  filename?: string;
  size?: number;
  urlPromise?: Promise<string>;
}

export interface AttachmentDesc {
  mime?: string;
  data?: string;
  filename?: string;
  size?: number;
  refurl?: string;
  urlPromise?: Promise<string>;
}

export interface LinkData {
  txt: string;
  url: string;
}

export interface VideoCallUpdate {
  state?: string;
  duration?: number;
  incoming?: boolean;
  vc?: boolean;
}

export type ButtonActionType = 'url' | 'pub';

interface FormatTag {
  html_tag: string;
  md_tag: string | undefined;
  isVoid: boolean;
}

interface Decorator {
  open: (data: DraftyEntData) => string;
  close: (data: DraftyEntData) => string;
  props?: (data: DraftyEntData) => DraftyAttributes | null;
}

interface InlineStyle {
  name: DraftyStyleType;
  start: RegExp;
  end: RegExp;
}

interface EntityType {
  name: DraftyEntityType;
  dataName: 'url' | 'val';
  pack: (val: string) => DraftyEntData;
  re: RegExp;
}

interface Span {
  txt: string;
  children: Span[];
  at: number;
  end: number;
  tp: DraftyStyleType;
}

interface Chunk {
  txt?: string;
  tp?: DraftyStyleType;
  children?: Chunk[];
}

interface ExtractedEntity {
  offset: number;
  len: number;
  unique: string;
  data: DraftyEntData;
  type: DraftyEntityType;
}

interface TreeSpan {
  type?: DraftyStyleType;
  start: number;
  end: number;
  key?: number;
  data?: DraftyEntData;
}

type AllowedEntField =
  | 'act'
  | 'height'
  | 'duration'
  | 'fn'
  | 'incoming'
  | 'mime'
  | 'name'
  | 'premime'
  | 'preref'
  | 'preview'
  | 'ref'
  | 'size'
  | 'state'
  | 'url'
  | 'val'
  | 'width';

const MAX_PREVIEW_ATTACHMENTS = 3;
const MAX_PREVIEW_DATA_SIZE = 64;
const DRAFTY_MIME_TYPE = 'text/x-drafty';
const DRAFTY_FR_MIME_TYPE = 'text/x-drafty-fr';
const DRAFTY_FR_MIME_TYPE_LEGACY = 'application/json';
const ALLOWED_ENT_FIELDS: readonly AllowedEntField[] = [
  'act',
  'height',
  'duration',
  'fn',
  'incoming',
  'mime',
  'name',
  'premime',
  'preref',
  'preview',
  'ref',
  'size',
  'state',
  'url',
  'val',
  'width',
];

const INLINE_STYLES: readonly InlineStyle[] = [
  {
    name: 'ST',
    start: /(?:^|[\W_])(\*)[^\s*]/,
    end: /[^\s*](\*)(?=$|[\W_])/,
  },
  {
    name: 'EM',
    start: /(?:^|\W)(_)[^\s_]/,
    end: /[^\s_](_)(?=$|\W)/,
  },
  {
    name: 'DL',
    start: /(?:^|[\W_])(~)[^\s~]/,
    end: /[^\s~](~)(?=$|[\W_])/,
  },
  {
    name: 'CO',
    start: /(?:^|\W)(`)[^`]/,
    end: /[^`](`)(?=$|\W)/,
  },
];

const FMT_WEIGHT: readonly (DraftyStyleType | undefined)[] = ['QQ'];

const ENTITY_TYPES: readonly EntityType[] = [
  {
    name: 'LN',
    dataName: 'url',
    pack: (val) => {
      if (!/^[a-z]+:\/\//i.test(val)) {
        val = 'http://' + val;
      }
      return { url: val };
    },
    re: /(?:(?:https?|ftp):\/\/|www\.|ftp\.)[-A-Z0-9+&@#/%=~_|$?!:,.]*[A-Z0-9+&@#/%=~_|$]/gi,
  },
  {
    name: 'MN',
    dataName: 'val',
    pack: (val) => ({ val: val.slice(1) }),
    re: /\B@([\p{L}\p{N}][._\p{L}\p{N}]*[\p{L}\p{N}])/gu,
  },
  {
    name: 'HT',
    dataName: 'val',
    pack: (val) => ({ val: val.slice(1) }),
    re: /\B#([\p{L}\p{N}][._\p{L}\p{N}]*[\p{L}\p{N}])/gu,
  },
];

const FORMAT_TAGS: Record<DraftyStyleType, FormatTag> = {
  AU: { html_tag: 'audio', md_tag: undefined, isVoid: false },
  BN: { html_tag: 'button', md_tag: undefined, isVoid: false },
  BR: { html_tag: 'br', md_tag: '\n', isVoid: true },
  CO: { html_tag: 'tt', md_tag: '`', isVoid: false },
  DL: { html_tag: 'del', md_tag: '~', isVoid: false },
  EM: { html_tag: 'i', md_tag: '_', isVoid: false },
  EX: { html_tag: '', md_tag: undefined, isVoid: true },
  FM: { html_tag: 'div', md_tag: undefined, isVoid: false },
  HD: { html_tag: '', md_tag: undefined, isVoid: false },
  HL: { html_tag: 'span', md_tag: undefined, isVoid: false },
  HT: { html_tag: 'a', md_tag: undefined, isVoid: false },
  IM: { html_tag: 'img', md_tag: undefined, isVoid: false },
  LN: { html_tag: 'a', md_tag: undefined, isVoid: false },
  MN: { html_tag: 'a', md_tag: undefined, isVoid: false },
  RW: { html_tag: 'div', md_tag: undefined, isVoid: false },
  QQ: { html_tag: 'div', md_tag: undefined, isVoid: false },
  ST: { html_tag: 'b', md_tag: '*', isVoid: false },
  TC: { html_tag: 'div', md_tag: undefined, isVoid: false },
  VC: { html_tag: 'div', md_tag: undefined, isVoid: false },
  VD: { html_tag: 'video', md_tag: undefined, isVoid: false },
};

function toInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

function base64Size(val: unknown): number {
  return typeof val === 'string' ? Math.floor(val.length * 0.75) : 0;
}

function base64toDataUrl(b64: unknown, contentType?: string): string | null {
  if (!b64 || typeof b64 !== 'string') {
    return null;
  }
  contentType = contentType || 'image/jpeg';
  return 'data:' + contentType + ';base64,' + b64;
}

function hasDom(): boolean {
  return Reflect.has(globalThis, 'document');
}

function base64toBlob(b64: string, contentType?: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  const blob: Blob = Reflect.construct(Blob, [
    [arr.buffer],
    { type: contentType },
  ]);
  return blob;
}

function base64toObjectUrl(
  b64: unknown,
  contentType?: string,
  logger?: DraftyLogger | null
): string | null {
  if (!b64 || typeof b64 !== 'string') {
    return null;
  }

  if (hasDom()) {
    try {
      return URL.createObjectURL(base64toBlob(b64, contentType));
    } catch (err) {
      if (logger) {
        logger(
          'Drafty: failed to convert object.',
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  return base64toDataUrl(b64, contentType || 'application/octet-stream');
}

function sanitizeUrl(url: string | undefined): string | null | undefined {
  if (!url || typeof url !== 'string') {
    return url;
  }
  if (!/^\s*([a-z][a-z0-9+.-]*:|\/\/)/im.test(url)) {
    return url;
  }
  if (/^(https?|ftp):\/\//i.test(url)) {
    return url;
  }
  return null;
}

const DECORATORS: Partial<Record<DraftyStyleType, Decorator>> = {
  ST: {
    open: () => '<b>',
    close: () => '</b>',
  },
  EM: {
    open: () => '<i>',
    close: () => '</i>',
  },
  DL: {
    open: () => '<del>',
    close: () => '</del>',
  },
  CO: {
    open: () => '<tt>',
    close: () => '</tt>',
  },
  BR: {
    open: () => '<br/>',
    close: () => '',
  },
  HD: {
    open: () => '',
    close: () => '',
  },
  HL: {
    open: () => '<span style="color:teal">',
    close: () => '</span>',
  },
  LN: {
    open: (data) => '<a href="' + data.url + '">',
    close: () => '</a>',
    props: (data) => ({
      href: sanitizeUrl(data.url),
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  MN: {
    open: (data) => '<a href="#' + data.val + '">',
    close: () => '</a>',
    props: (data) => ({
      id: typeof data.val === 'string' ? data.val : undefined,
    }),
  },
  HT: {
    open: (data) => '<a href="#' + data.val + '">',
    close: () => '</a>',
    props: (data) => ({
      id: typeof data.val === 'string' ? data.val : undefined,
    }),
  },
  BN: {
    open: () => '<button>',
    close: () => '</button>',
    props: (data) => ({
      'data-act': data.act,
      'data-val': typeof data.val === 'string' ? data.val : undefined,
      'data-name': data.name,
      'data-ref': sanitizeUrl(data.ref),
    }),
  },
  AU: {
    open: (data) => {
      const url =
        data.ref || base64toObjectUrl(data.val, data.mime, Drafty.logger);
      return '<audio controls src="' + url + '">';
    },
    close: () => '</audio>',
    props: (data) => {
      const safeRef = sanitizeUrl(data.ref);
      return {
        'src': safeRef || base64toObjectUrl(data.val, data.mime, Drafty.logger),
        'data-preload': safeRef ? 'metadata' : 'auto',
        'data-duration': data.duration,
        'data-name': data.name,
        'data-size': data.val ? base64Size(data.val) : toInt(data.size),
        'data-mime': data.mime,
      };
    },
  },
  IM: {
    open: (data) => {
      const tmpPreviewUrl = base64toDataUrl(data._tempPreview, data.mime);
      const previewUrl = base64toObjectUrl(data.val, data.mime, Drafty.logger);
      const downloadUrl = data.ref || previewUrl;
      return (
        (data.name
          ? '<a href="' + downloadUrl + '" download="' + data.name + '">'
          : '') +
        '<img src="' +
        (tmpPreviewUrl || previewUrl) +
        '"' +
        (data.width ? ' width="' + data.width + '"' : '') +
        (data.height ? ' height="' + data.height + '"' : '') +
        ' border="0" />'
      );
    },
    close: (data) => (data.name ? '</a>' : ''),
    props: (data) => ({
      'src':
        base64toDataUrl(data._tempPreview, data.mime) ||
        sanitizeUrl(data.ref) ||
        base64toObjectUrl(data.val, data.mime, Drafty.logger),
      'title': data.name,
      'alt': data.name,
      'data-width': data.width,
      'data-height': data.height,
      'data-name': data.name,
      'data-size': data.ref
        ? toInt(data.size)
        : data.val
          ? base64Size(data.val)
          : toInt(data.size),
      'data-mime': data.mime,
    }),
  },
  FM: {
    open: () => '<div>',
    close: () => '</div>',
  },
  RW: {
    open: () => '<div>',
    close: () => '</div>',
  },
  QQ: {
    open: () => '<div>',
    close: () => '</div>',
    props: () => ({}),
  },
  TC: {
    open: () => '<div>',
    close: () => '</div>',
    props: (data) => ({
      'data-fn': data.fn,
      'data-title': data.title,
    }),
  },
  VC: {
    open: () => '<div>',
    close: () => '</div>',
    props: (data) => ({
      'data-duration': data.duration,
      'data-state': data.state,
    }),
  },
  VD: {
    open: (data) => {
      const tmpPreviewUrl = base64toDataUrl(data._tempPreview, data.mime);
      const previewUrl =
        data.ref ||
        base64toObjectUrl(
          data.preview,
          data.premime || 'image/jpeg',
          Drafty.logger
        );
      return (
        '<img src="' +
        (tmpPreviewUrl || previewUrl) +
        '"' +
        (data.width ? ' width="' + data.width + '"' : '') +
        (data.height ? ' height="' + data.height + '"' : '') +
        ' border="0" />'
      );
    },
    close: () => '',
    props: (data) => {
      const safePreref = sanitizeUrl(data.preref);
      const safeRef = sanitizeUrl(data.ref);
      const poster =
        safePreref ||
        base64toObjectUrl(
          data.preview,
          data.premime || 'image/jpeg',
          Drafty.logger
        );
      return {
        'src': poster,
        'data-src':
          safeRef || base64toObjectUrl(data.val, data.mime, Drafty.logger),
        'data-width': data.width,
        'data-height': data.height,
        'data-preload': safeRef ? 'metadata' : 'auto',
        'data-preview': poster,
        'data-duration': toInt(data.duration),
        'data-name': data.name,
        'data-size': data.ref
          ? toInt(data.size)
          : data.val
            ? base64Size(data.val)
            : toInt(data.size),
        'data-mime': data.mime,
      };
    },
  },
};

export default class Drafty implements DraftyDoc {
  txt = '';
  fmt: DraftyFmt[] = [];
  ent: DraftyEnt[] = [];

  static logger?: DraftyLogger | null;

  static readonly contentType = DRAFTY_MIME_TYPE;

  static init(plainText?: unknown): DraftyDoc | null {
    if (typeof plainText === 'undefined') {
      return { txt: '' };
    }
    if (typeof plainText !== 'string') {
      return null;
    }
    return { txt: plainText };
  }

  static parse(content: string): DraftyDoc;
  static parse(content: unknown): DraftyDoc | null;
  static parse(content: unknown): DraftyDoc | null {
    if (typeof content !== 'string') {
      return null;
    }

    const lines = content.split(/\r?\n/);

    const entityMap: DraftyEnt[] = [];
    const entityIndex = new Map<string, number>();

    const blx: { txt: string; fmt?: DraftyFmt[]; ent?: DraftyFmt[] }[] = [];
    lines.forEach((line) => {
      let spans: Span[] = [];

      INLINE_STYLES.forEach((tag) => {
        spans = spans.concat(spannify(line, tag.start, tag.end, tag.name));
      });

      let block: { txt: string; fmt?: DraftyFmt[]; ent?: DraftyFmt[] };
      if (spans.length === 0) {
        block = { txt: line };
      } else {
        spans.sort((a, b) => {
          const diff = a.at - b.at;
          return diff !== 0 ? diff : b.end - a.end;
        });

        spans = toSpanTree(spans);

        const chunks = chunkify(line, 0, line.length, spans);
        const drafty = draftify(chunks, 0);

        block = { txt: drafty.txt, fmt: drafty.fmt };
      }

      const entities = extractEntities(block.txt);
      if (entities.length > 0) {
        const ranges: DraftyFmt[] = [];
        for (const entity of entities) {
          let index = entityIndex.get(entity.unique);
          if (index === undefined) {
            index = entityMap.length;
            entityIndex.set(entity.unique, index);
            entityMap.push({ tp: entity.type, data: entity.data });
          }
          ranges.push({ at: entity.offset, len: entity.len, key: index });
        }
        block.ent = ranges;
      }

      blx.push(block);
    });

    const result: DraftyDoc = { txt: '' };

    const first = blx[0];
    if (first) {
      let txt = first.txt;
      let fmt = (first.fmt || []).concat(first.ent || []);

      if (fmt.length) {
        const segments = splitGraphemes(txt);
        for (const ele of fmt) {
          ({ at: ele.at, len: ele.len } = toGraphemeValues(ele, segments, txt));
        }
      }

      for (const block of blx.slice(1)) {
        const offset = splitGraphemes(txt).length + 1;

        fmt.push({ tp: 'BR', len: 1, at: offset - 1 });

        txt += ' ' + block.txt;

        const ranges = (block.fmt || []).concat(block.ent || []);
        if (ranges.length) {
          const segments = splitGraphemes(block.txt);
          fmt = fmt.concat(
            ranges.map((s) => {
              const { at, len } = toGraphemeValues(s, segments, block.txt);
              s.at = at + offset;
              s.len = len;
              return s;
            })
          );
        }
      }

      result.txt = txt;
      if (fmt.length > 0) {
        result.fmt = fmt;
      }
      if (entityMap.length > 0) {
        result.ent = entityMap;
      }
    }
    return result;
  }

  static append(first: DraftyDoc, second: DraftySource): DraftyDoc;
  static append(
    first: DraftyDoc | null | undefined,
    second: DraftySource
  ): DraftySource;
  static append(
    first: DraftyDoc | null | undefined,
    second: DraftySource
  ): DraftySource {
    if (!first) {
      return second;
    }
    if (!second) {
      return first;
    }

    first.txt = first.txt || '';
    const len = stringToGraphemes(first.txt).length;

    if (typeof second === 'string') {
      first.txt += second;
      return first;
    }
    if (second.txt) {
      first.txt += second.txt;
    }

    if (Array.isArray(second.fmt)) {
      const fmts = (first.fmt = first.fmt || []);
      const ents = Array.isArray(second.ent)
        ? (first.ent = first.ent || [])
        : undefined;
      second.fmt.forEach((src) => {
        const fmt: DraftyFmt = {
          at: toInt(src.at) + len,
          len: toInt(src.len),
        };
        if (src.at === -1) {
          fmt.at = -1;
          fmt.len = 0;
        }
        if (src.tp) {
          fmt.tp = src.tp;
        } else {
          const ent = second.ent?.[src.key || 0];
          if (!ent || !ents) {
            return;
          }
          fmt.key = ents.length;
          ents.push(ent);
        }
        fmts.push(fmt);
      });
    }

    return first;
  }

  static insertImage(
    content: DraftyDoc | null | undefined,
    at: number,
    imageDesc: ImageDesc
  ): DraftyDoc {
    content = content || { txt: ' ' };
    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: toInt(at), len: 1, key: content.ent.length });

    const data: DraftyEntData = {
      mime: imageDesc.mime,
      ref: imageDesc.refurl,
      val: imageDesc.bits || imageDesc.preview,
      width: imageDesc.width,
      height: imageDesc.height,
      name: imageDesc.filename,
      size: toInt(imageDesc.size),
    };

    if (imageDesc.urlPromise) {
      data._tempPreview = imageDesc._tempPreview;
      data._processing = true;
      imageDesc.urlPromise.then(
        (url) => {
          data.ref = url;
          data._tempPreview = undefined;
          data._processing = undefined;
        },
        () => {
          data._processing = undefined;
        }
      );
    }

    content.ent.push({ tp: 'IM', data });

    return content;
  }

  static insertVideo(
    content: DraftyDoc | null | undefined,
    at: number,
    videoDesc: VideoDesc
  ): DraftyDoc {
    content = content || { txt: ' ' };
    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: toInt(at), len: 1, key: content.ent.length });

    const data: DraftyEntData = {
      mime: videoDesc.mime,
      ref: videoDesc.refurl,
      val: videoDesc.bits,
      preref: videoDesc.preref,
      preview: videoDesc.preview,
      width: videoDesc.width,
      height: videoDesc.height,
      duration: toInt(videoDesc.duration),
      name: videoDesc.filename,
      size: toInt(videoDesc.size),
    };

    if (videoDesc.urlPromise) {
      data._tempPreview = videoDesc._tempPreview;
      data._processing = true;
      videoDesc.urlPromise.then(
        (urls) => {
          data.ref = urls[0];
          data.preref = urls[1];
          data._tempPreview = undefined;
          data._processing = undefined;
        },
        () => {
          data._processing = undefined;
        }
      );
    }

    content.ent.push({ tp: 'VD', data });

    return content;
  }

  static insertAudio(
    content: DraftyDoc | null | undefined,
    at: number,
    audioDesc: AudioDesc
  ): DraftyDoc {
    content = content || { txt: ' ' };
    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: toInt(at), len: 1, key: content.ent.length });

    const data: DraftyEntData = {
      mime: audioDesc.mime,
      val: audioDesc.bits,
      duration: toInt(audioDesc.duration),
      preview: audioDesc.preview,
      name: audioDesc.filename,
      size: toInt(audioDesc.size),
      ref: audioDesc.refurl,
    };

    if (audioDesc.urlPromise) {
      data._processing = true;
      audioDesc.urlPromise.then(
        (url) => {
          data.ref = url;
          data._processing = undefined;
        },
        () => {
          data._processing = undefined;
        }
      );
    }

    content.ent.push({ tp: 'AU', data });

    return content;
  }

  static videoCall(audioOnly?: boolean): DraftyDoc {
    return {
      txt: ' ',
      fmt: [{ at: 0, len: 1, key: 0 }],
      ent: [{ tp: 'VC', data: { aonly: audioOnly } }],
    };
  }

  static updateVideoCall<T extends DraftyDoc | null | undefined>(
    content: T,
    params: VideoCallUpdate
  ): T {
    const fmt = content?.fmt?.[0];
    if (!content || !fmt) {
      return content;
    }

    let ent: DraftyEnt | undefined;
    if (fmt.tp === 'VC') {
      delete fmt.tp;
      fmt.key = 0;
      ent = { tp: 'VC' };
      content.ent = [ent];
    } else {
      ent = content.ent?.[toInt(fmt.key)];
      if (!ent || ent.tp !== 'VC') {
        return content;
      }
    }
    ent.data = ent.data || {};
    Object.assign(ent.data, params);
    return content;
  }

  static quote(header: string, uid: string, body: DraftySource): DraftyDoc {
    const quote = Drafty.append(
      Drafty.appendLineBreak(Drafty.mention(header, uid)),
      body
    );

    quote.fmt = quote.fmt || [];
    quote.fmt.push({
      at: 0,
      len: stringToGraphemes(quote.txt || '').length,
      tp: 'QQ',
    });

    return quote;
  }

  static mention(name: string | null | undefined, uid: string): DraftyDoc {
    return {
      txt: name || '',
      fmt: [{ at: 0, len: stringToGraphemes(name || '').length, key: 0 }],
      ent: [{ tp: 'MN', data: { val: uid } }],
    };
  }

  static appendLink(
    content: DraftyDoc | null | undefined,
    linkData: LinkData
  ): DraftyDoc {
    content = content || { txt: '' };
    content.txt = content.txt || '';

    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({
      at: stringToGraphemes(content.txt).length,
      len: stringToGraphemes(linkData.txt).length,
      key: content.ent.length,
    });
    content.txt += linkData.txt;

    content.ent.push({ tp: 'LN', data: { url: linkData.url } });

    return content;
  }

  static appendImage(
    content: DraftyDoc | null | undefined,
    imageDesc: ImageDesc
  ): DraftyDoc {
    content = content || { txt: '' };
    content.txt = (content.txt || '') + ' ';
    return Drafty.insertImage(
      content,
      stringToGraphemes(content.txt).length - 1,
      imageDesc
    );
  }

  static appendAudio(
    content: DraftyDoc | null | undefined,
    audioDesc: AudioDesc
  ): DraftyDoc {
    content = content || { txt: '' };
    content.txt = (content.txt || '') + ' ';
    return Drafty.insertAudio(
      content,
      stringToGraphemes(content.txt).length - 1,
      audioDesc
    );
  }

  static attachFile(
    content: DraftyDoc | null | undefined,
    attachmentDesc: AttachmentDesc
  ): DraftyDoc {
    content = content || { txt: '' };

    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: -1, len: 0, key: content.ent.length });

    const data: DraftyEntData = {
      mime: attachmentDesc.mime,
      val: attachmentDesc.data,
      name: attachmentDesc.filename,
      ref: attachmentDesc.refurl,
      size: toInt(attachmentDesc.size),
    };
    if (attachmentDesc.urlPromise) {
      data._processing = true;
      attachmentDesc.urlPromise.then(
        (url) => {
          data.ref = url;
          data._processing = undefined;
        },
        () => {
          data._processing = undefined;
        }
      );
    }
    content.ent.push({ tp: 'EX', data });

    return content;
  }

  static wrapInto(
    content: DraftyDoc | string,
    style: DraftyStyleType,
    at?: number,
    len?: number
  ): DraftyDoc {
    if (typeof content === 'string') {
      content = { txt: content };
    }
    content.fmt = content.fmt || [];

    content.fmt.push({
      at: at || 0,
      len: len || stringToGraphemes(content.txt || '').length,
      tp: style,
    });

    return content;
  }

  static wrapAsForm(
    content: DraftyDoc | string,
    at?: number,
    len?: number
  ): DraftyDoc {
    return Drafty.wrapInto(content, 'FM', at, len);
  }

  static insertButton(
    content: DraftySource,
    at: number,
    len: number,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null {
    if (typeof content === 'string') {
      content = { txt: content };
    }

    if (
      !content ||
      !content.txt ||
      stringToGraphemes(content.txt).length < at + len
    ) {
      return null;
    }

    if (len <= 0 || ['url', 'pub'].indexOf(actionType) === -1) {
      return null;
    }
    if (actionType === 'url' && !refUrl) {
      return null;
    }

    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: toInt(at), len, key: content.ent.length });
    content.ent.push({
      tp: 'BN',
      data: {
        act: actionType,
        val: actionValue,
        ref: refUrl === undefined || refUrl === null ? undefined : '' + refUrl,
        name,
      },
    });

    return content;
  }

  static appendButton(
    content: DraftyDoc | null | undefined,
    title: string,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null {
    content = content || { txt: '' };
    content.txt = content.txt || '';
    const at = stringToGraphemes(content.txt).length;
    content.txt += title;
    return Drafty.insertButton(
      content,
      at,
      stringToGraphemes(title).length,
      name,
      actionType,
      actionValue,
      refUrl
    );
  }

  static attachJSON(
    content: DraftyDoc | null | undefined,
    data: DraftyJsonObject
  ): DraftyDoc {
    content = content || { txt: '' };
    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({ at: -1, len: 0, key: content.ent.length });

    content.ent.push({
      tp: 'EX',
      data: { mime: DRAFTY_FR_MIME_TYPE, val: data },
    });

    return content;
  }

  static appendLineBreak(content: DraftyDoc | null | undefined): DraftyDoc {
    content = content || { txt: '' };
    content.txt = content.txt || '';
    content.fmt = content.fmt || [];
    content.fmt.push({
      at: stringToGraphemes(content.txt).length,
      len: 1,
      tp: 'BR',
    });
    content.txt += ' ';

    return content;
  }

  static appendTheCard(
    content: DraftyDoc | null | undefined,
    theCardData: CardData
  ): DraftyDoc {
    content = content || { txt: '' };
    content.txt = content.txt || '';
    content.ent = content.ent || [];
    content.fmt = content.fmt || [];

    content.fmt.push({
      at: stringToGraphemes(content.txt).length,
      len: 1,
      key: content.ent.length,
    });
    content.txt += ' ';

    content.ent.push({ tp: 'TC', data: theCardData });

    return content;
  }

  static UNSAFE_toHTML(doc: DraftySource): string | null {
    const tree = draftyToTree(doc);
    const htmlFormatter: DraftyFormatter<string> = (type, data, values) => {
      const tag = type ? DECORATORS[type] : undefined;
      let result = values ? values.join('') : '';
      if (tag) {
        result = tag.open(data || {}) + result + tag.close(data || {});
      }
      return result;
    };
    return treeBottomUp(tree, htmlFormatter, 0) ?? null;
  }

  static format<R>(
    original: DraftySource,
    formatter: DraftyFormatter<R>,
    context?: unknown
  ): R | null | undefined {
    return treeBottomUp(draftyToTree(original), formatter, 0, [], context);
  }

  static shorten(
    original: DraftySource,
    limit: number,
    light?: boolean
  ): DraftyDoc {
    let tree = draftyToTree(original);
    tree = shortenTree(tree, limit, '…');
    if (tree && light) {
      tree = lightEntity(tree);
    }
    return treeToDrafty({}, tree, []);
  }

  static forwardedContent(original: DraftySource): DraftyDoc {
    let tree = draftyToTree(original);
    const rmMention = (node: DraftyNode) => {
      if (node.type === 'MN') {
        if (!node.parent || !node.parent.type) {
          return null;
        }
      }
      return node;
    };
    tree = treeTopDown(tree, rmMention);
    tree = lTrim(tree);
    return treeToDrafty({}, tree, []);
  }

  static replyContent(original: DraftySource, limit: number): DraftySource {
    const convMNnQQnBR = (node: DraftyNode) => {
      if (node.type === 'QQ') {
        return null;
      } else if (node.type === 'MN') {
        if (
          (!node.parent || !node.parent.type) &&
          (node.text || '').startsWith('➦')
        ) {
          node.text = '➦';
          delete node.children;
          delete node.data;
        }
      } else if (node.type === 'BR') {
        node.text = ' ';
        delete node.type;
        delete node.children;
      }
      return node;
    };

    let tree = draftyToTree(original);
    if (!tree) {
      return original;
    }

    tree = treeTopDown(tree, convMNnQQnBR);
    tree = attachmentsToEnd(tree, MAX_PREVIEW_ATTACHMENTS);
    tree = shortenTree(tree, limit, '…');
    const filter = (node: DraftyNode): AllowedEntField[] | null => {
      switch (node.type) {
        case 'IM':
          return ['val'];
        case 'VD':
          return ['preview'];
      }
      return null;
    };
    tree = lightEntity(tree, filter);
    return treeToDrafty({}, tree, []);
  }

  static preview(
    original: DraftySource,
    limit: number,
    forwarding?: boolean
  ): DraftyDoc {
    let tree = draftyToTree(original);

    tree = attachmentsToEnd(tree, MAX_PREVIEW_ATTACHMENTS);

    const convMNnQQnBR = (node: DraftyNode) => {
      if (node.type === 'MN') {
        if (
          (!node.parent || !node.parent.type) &&
          (node.text || '').startsWith('➦')
        ) {
          node.text = '➦';
          delete node.children;
        }
      } else if (node.type === 'QQ') {
        node.text = ' ';
        delete node.children;
      } else if (node.type === 'BR') {
        node.text = ' ';
        delete node.children;
        delete node.type;
      }
      return node;
    };
    tree = treeTopDown(tree, convMNnQQnBR);

    tree = shortenTree(tree, limit, '…');
    if (forwarding) {
      const filter: Partial<Record<DraftyStyleType, AllowedEntField[]>> = {
        IM: ['val'],
        VD: ['preview'],
      };
      tree = lightEntity(tree, (node) =>
        node.type ? filter[node.type] : undefined
      );
    } else {
      tree = lightEntity(tree);
    }

    return treeToDrafty({}, tree, []);
  }

  static toPlainText(content: DraftyDoc | string): string | undefined {
    return typeof content === 'string' ? content : content.txt;
  }

  static isPlainText(content: DraftyDoc | string): boolean {
    return typeof content === 'string' || !(content.fmt || content.ent);
  }

  static toMarkdown(content: DraftySource): string | null {
    const tree = draftyToTree(content);
    const mdFormatter: DraftyFormatter<string> = (type, _, values) => {
      const def = type ? FORMAT_TAGS[type] : undefined;
      let result = values ? values.join('') : '';
      if (def) {
        if (def.isVoid) {
          result = def.md_tag || '';
        } else if (def.md_tag) {
          result = def.md_tag + result + def.md_tag;
        }
      }
      return result;
    };
    return treeBottomUp(tree, mdFormatter, 0) ?? null;
  }

  static isValid(content: unknown): boolean {
    if (!isRecord(content)) {
      return false;
    }

    const { txt, fmt, ent } = content;

    if (!txt && txt !== '' && !fmt && !ent) {
      return false;
    }

    const txtType = typeof txt;
    if (txtType !== 'string' && txtType !== 'undefined' && txt !== null) {
      return false;
    }

    if (typeof fmt !== 'undefined' && !Array.isArray(fmt) && fmt !== null) {
      return false;
    }

    if (typeof ent !== 'undefined' && !Array.isArray(ent) && ent !== null) {
      return false;
    }
    return true;
  }

  static hasAttachments(content: DraftyDoc): boolean {
    if (!Array.isArray(content.fmt)) {
      return false;
    }
    for (const fmt of content.fmt) {
      if (fmt && toInt(fmt.at) < 0) {
        const ent = content.ent?.[toInt(fmt.key)];
        return !!ent && ent.tp === 'EX' && !!ent.data;
      }
    }
    return false;
  }

  static attachments(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void {
    if (!Array.isArray(content.fmt)) {
      return;
    }
    let count = 0;
    for (const fmt of content.fmt) {
      if (fmt && toInt(fmt.at) < 0) {
        const ent = content.ent?.[toInt(fmt.key)];
        if (ent && ent.tp === 'EX' && ent.data) {
          if (callback.call(context, ent.data, count++, 'EX')) {
            break;
          }
        }
      }
    }
  }

  static hasEntities(content: DraftySource): boolean {
    return (
      !!content &&
      typeof content === 'object' &&
      !!content.ent &&
      content.ent.length > 0
    );
  }

  static entities(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void {
    if (content.ent && content.ent.length > 0) {
      for (let i = 0; i < content.ent.length; i++) {
        const ent = content.ent[i];
        if (ent) {
          if (callback.call(context, ent.data, i, ent.tp)) {
            break;
          }
        }
      }
    }
  }

  static styles(
    content: DraftyDoc,
    callback: DraftyStyleCallback,
    context?: unknown
  ): void {
    if (content.fmt && content.fmt.length > 0) {
      for (let i = 0; i < content.fmt.length; i++) {
        const fmt = content.fmt[i];
        if (fmt) {
          if (callback.call(context, fmt.tp, fmt.at, fmt.len, fmt.key, i)) {
            break;
          }
        }
      }
    }
  }

  static sanitizeEntities<T extends DraftyDoc | null | undefined>(
    content: T
  ): T {
    if (content && content.ent && content.ent.length > 0) {
      for (const ent of content.ent) {
        if (ent && ent.data) {
          const data = copyEntData(ent.data);
          if (data) {
            ent.data = data;
          } else {
            delete ent.data;
          }
        }
      }
    }
    return content;
  }

  static getDownloadUrl(entData: DraftyEntData): string | null {
    let url: string | null = null;
    if (!Drafty.isFormResponseType(entData.mime) && entData.val) {
      url = base64toObjectUrl(entData.val, entData.mime, Drafty.logger);
    } else if (typeof entData.ref === 'string') {
      url = sanitizeUrl(entData.ref) ?? null;
    }
    return url;
  }

  static isProcessing(entData: DraftyEntData): boolean {
    return !!entData._processing;
  }

  static getPreviewUrl(entData: DraftyEntData): string | null {
    return entData.val
      ? base64toObjectUrl(entData.val, entData.mime, Drafty.logger)
      : null;
  }

  static getEntitySize(entData: DraftyEntData): number {
    return entData.size
      ? entData.size
      : entData.val
        ? base64Size(entData.val)
        : 0;
  }

  static getEntityMimeType(entData: DraftyEntData): string {
    return entData.mime || 'text/plain';
  }

  static tagName(style: DraftyStyleType | undefined): string | undefined {
    return style ? FORMAT_TAGS[style]?.html_tag : undefined;
  }

  static attrValue(
    style: DraftyStyleType | undefined,
    data: DraftyEntData | null | undefined
  ): DraftyAttributes | null | undefined {
    const props = style ? DECORATORS[style]?.props : undefined;
    if (data && props) {
      return props(data);
    }
    return undefined;
  }

  static getContentType(): string {
    return DRAFTY_MIME_TYPE;
  }

  static isFormResponseType(mimeType: string | null | undefined): boolean {
    return (
      mimeType === DRAFTY_FR_MIME_TYPE ||
      mimeType === DRAFTY_FR_MIME_TYPE_LEGACY
    );
  }
}

function chunkify(
  line: string,
  start: number,
  end: number,
  spans: Span[]
): Chunk[] {
  const chunks: Chunk[] = [];

  if (spans.length === 0) {
    return [];
  }

  for (const span of spans) {
    if (span.at > start) {
      chunks.push({ txt: line.slice(start, span.at) });
    }

    const chunk: Chunk = { tp: span.tp };
    const chld = chunkify(line, span.at + 1, span.end, span.children);
    if (chld.length > 0) {
      chunk.children = chld;
    } else {
      chunk.txt = span.txt;
    }
    chunks.push(chunk);
    start = span.end + 1;
  }

  if (start < end) {
    chunks.push({ txt: line.slice(start, end) });
  }

  return chunks;
}

function spannify(
  original: string,
  reStart: RegExp,
  reEnd: RegExp,
  type: DraftyStyleType
): Span[] {
  const result: Span[] = [];
  let index = 0;
  let line = original;

  while (line.length > 0) {
    const start = reStart.exec(line);
    if (start == null) {
      break;
    }

    let startOffset = start.index + start[0].lastIndexOf(start[1] ?? '');
    line = line.slice(startOffset + 1);
    startOffset += index;
    index = startOffset + 1;

    const end = reEnd.exec(line);
    if (end == null) {
      break;
    }
    let endOffset = end.index + end[0].indexOf(end[1] ?? '');
    line = line.slice(endOffset + 1);
    endOffset += index;
    index = endOffset + 1;

    result.push({
      txt: original.slice(startOffset + 1, endOffset),
      children: [],
      at: startOffset,
      end: endOffset,
      tp: type,
    });
  }

  return result;
}

function toSpanTree(spans: Span[]): Span[] {
  const [first, ...rest] = spans;
  if (!first) {
    return [];
  }

  const tree = [first];
  let last = first;
  for (const span of rest) {
    if (span.at > last.end) {
      tree.push(span);
      last = span;
    } else if (span.end <= last.end) {
      last.children.push(span);
    }
  }

  for (const span of tree) {
    span.children = toSpanTree(span.children);
  }

  return tree;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isStyleType(value: unknown): value is DraftyStyleType {
  return typeof value === 'string' && value in FORMAT_TAGS;
}

function draftyToTree(doc: DraftySource): DraftyNode | null {
  if (!doc) {
    return null;
  }

  const source: DraftyDoc = typeof doc === 'string' ? { txt: doc } : doc;
  const txt = source.txt || '';
  const ent = Array.isArray(source.ent) ? source.ent : [];
  let fmt = Array.isArray(source.fmt) ? source.fmt : [];

  if (fmt.length === 0) {
    if (ent.length === 0) {
      return { text: txt };
    }
    fmt = [{ at: 0, len: 0, key: 0 }];
  }

  const graphemes = stringToGraphemes(txt);

  const spans: TreeSpan[] = [];
  const attachments: TreeSpan[] = [];
  fmt.forEach((span) => {
    if (!span || typeof span !== 'object') {
      return;
    }

    if (!['undefined', 'number'].includes(typeof span.at)) {
      return;
    }
    if (!['undefined', 'number'].includes(typeof span.len)) {
      return;
    }
    const at = toInt(span.at);
    const len = toInt(span.len);
    if (len < 0) {
      return;
    }

    const key = span.key || 0;
    if (
      ent.length > 0 &&
      (typeof key !== 'number' || key < 0 || key >= ent.length)
    ) {
      return;
    }

    if (at <= -1) {
      attachments.push({ start: -1, end: 0, key });
      return;
    } else if (at + len > graphemes.length) {
      return;
    }

    if (!span.tp) {
      if (ent.length > 0 && typeof ent[key] === 'object') {
        spans.push({ start: at, end: at + len, key });
      }
    } else if (isStyleType(span.tp)) {
      spans.push({ type: span.tp, start: at, end: at + len });
    }
  });

  spans.sort((a, b) => {
    let diff = a.start - b.start;
    if (diff !== 0) {
      return diff;
    }
    diff = b.end - a.end;
    if (diff !== 0) {
      return diff;
    }
    return FMT_WEIGHT.indexOf(b.type) - FMT_WEIGHT.indexOf(a.type);
  });

  spans.push(...attachments);

  spans.forEach((span) => {
    const entity = span.type ? undefined : ent[span.key ?? 0];
    if (entity && typeof entity === 'object') {
      if (isStyleType(entity.tp)) {
        span.type = entity.tp;
      }
      span.data = entity.data;
    }

    if (!span.type) {
      span.type = 'HD';
    }
  });

  let tree: DraftyNode | null = spansToTree(
    {},
    graphemes,
    0,
    graphemes.length,
    spans
  );

  const flatten = (node: DraftyNode) => {
    if (Array.isArray(node.children) && node.children.length === 1) {
      const child = node.children[0];
      if (child && !node.type) {
        const parent = node.parent;
        node = child;
        node.parent = parent;
      } else if (child && !child.type && !child.children) {
        node.text = child.text;
        delete node.children;
      }
    }
    return node;
  };
  tree = treeTopDown(tree, flatten);

  return tree;
}

function addNode(parent: DraftyNode, n: DraftyNode | null): DraftyNode {
  if (!n) {
    return parent;
  }

  if (!parent.children) {
    parent.children = [];
  }

  if (parent.text) {
    parent.children.push({ text: parent.text, parent });
    delete parent.text;
  }

  n.parent = parent;
  parent.children.push(n);

  return parent;
}

function joinGraphemes(
  graphemes: GraphemeSegment[],
  start: number,
  end: number
): string {
  return graphemes
    .slice(start, end)
    .map((segment) => segment.segment)
    .join('');
}

function spansToTree(
  parent: DraftyNode,
  graphemes: GraphemeSegment[],
  start: number,
  end: number,
  spans: TreeSpan[]
): DraftyNode {
  if (!spans || spans.length === 0) {
    if (start < end) {
      addNode(parent, { text: joinGraphemes(graphemes, start, end) });
    }
    return parent;
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (!span) {
      continue;
    }
    if (span.start < 0 && span.type === 'EX') {
      addNode(parent, {
        type: span.type,
        data: span.data,
        key: span.key,
        att: true,
      });
      continue;
    }

    if (start < span.start) {
      addNode(parent, { text: joinGraphemes(graphemes, start, span.start) });
      start = span.start;
    }

    const subspans: TreeSpan[] = [];
    while (i < spans.length - 1) {
      const inner = spans[i + 1];
      if (!inner || inner.start < 0) {
        break;
      } else if (inner.start < span.end) {
        if (inner.end <= span.end) {
          const isVoid = inner.type ? FORMAT_TAGS[inner.type].isVoid : false;
          if (inner.start < inner.end || isVoid) {
            subspans.push(inner);
          }
        }
        i++;
      } else {
        break;
      }
    }

    addNode(
      parent,
      spansToTree(
        { type: span.type, data: span.data, key: span.key },
        graphemes,
        start,
        span.end,
        subspans
      )
    );
    start = span.end;
  }

  if (start < end) {
    addNode(parent, { text: joinGraphemes(graphemes, start, end) });
  }

  return parent;
}

function treeToDrafty(
  doc: DraftyDoc,
  tree: DraftyNode | null,
  keymap: number[]
): DraftyDoc {
  if (!tree) {
    return doc;
  }

  doc.txt = doc.txt || '';

  const start = stringToGraphemes(doc.txt).length;

  if (tree.text) {
    doc.txt += tree.text;
  } else if (Array.isArray(tree.children)) {
    tree.children.forEach((c) => {
      treeToDrafty(doc, c, keymap);
    });
  }

  if (tree.type) {
    const len = stringToGraphemes(doc.txt).length - start;
    doc.fmt = doc.fmt || [];
    if (tree.data && Object.keys(tree.data).length > 0) {
      doc.ent = doc.ent || [];
      const oldKey = tree.key ?? 0;
      const newKey = keymap[oldKey] ?? doc.ent.length;
      keymap[oldKey] = newKey;
      doc.ent[newKey] = { tp: tree.type, data: tree.data };
      if (tree.att) {
        doc.fmt.push({ at: -1, len: 0, key: newKey });
      } else {
        doc.fmt.push({ at: start, len, key: newKey });
      }
    } else {
      doc.fmt.push({ tp: tree.type, at: start, len });
    }
  }
  return doc;
}

function treeTopDown(
  src: DraftyNode | null,
  transformer: (node: DraftyNode) => DraftyNode | null
): DraftyNode | null {
  if (!src) {
    return null;
  }

  const dst = transformer(src);
  if (!dst || !dst.children) {
    return dst;
  }

  const children: DraftyNode[] = [];
  for (const child of dst.children) {
    if (child) {
      const n = treeTopDown(child, transformer);
      if (n) {
        children.push(n);
      }
    }
  }

  dst.children = children.length === 0 ? null : children;

  return dst;
}

function treeBottomUp<R>(
  src: DraftyNode | null,
  formatter: DraftyFormatter<R>,
  index: number,
  stack?: DraftyStyleType[],
  context?: unknown
): R | null | undefined {
  if (!src) {
    return null;
  }

  if (stack && src.type) {
    stack.push(src.type);
  }

  const childValues: (R | string)[] = [];
  (src.children || []).forEach((child, i) => {
    const n = treeBottomUp(child, formatter, i, stack, context);
    if (n) {
      childValues.push(n);
    }
  });
  const values =
    childValues.length > 0 ? childValues : src.text ? [src.text] : null;

  if (stack && src.type) {
    stack.pop();
  }

  return formatter.call(context, src.type, src.data, values, index, stack);
}

function shortenTree(
  tree: DraftyNode | null,
  limit: number,
  tail: string
): DraftyNode | null {
  if (!tree) {
    return null;
  }

  if (tail) {
    limit -= tail.length;
  }

  const shortener = (node: DraftyNode) => {
    if (limit <= -1) {
      return null;
    }

    if (node.att) {
      return node;
    }
    if (limit === 0) {
      node.text = tail;
      limit = -1;
    } else if (node.text) {
      const graphemes = stringToGraphemes(node.text);
      if (graphemes.length > limit) {
        node.text = joinGraphemes(graphemes, 0, limit) + tail;
        limit = -1;
      } else {
        limit -= graphemes.length;
      }
    }
    return node;
  };

  return treeTopDown(tree, shortener);
}

function lightEntity(
  tree: DraftyNode | null,
  allow?: (node: DraftyNode) => AllowedEntField[] | null | undefined
): DraftyNode | null {
  const lightCopy = (node: DraftyNode) => {
    const data = copyEntData(node.data, true, allow ? allow(node) : null);
    if (data) {
      node.data = data;
    } else {
      delete node.data;
    }
    return node;
  };
  return treeTopDown(tree, lightCopy);
}

function lTrim(tree: DraftyNode | null): DraftyNode | null {
  if (!tree) {
    return null;
  }
  if (tree.type === 'BR') {
    return null;
  }
  if (tree.text) {
    if (!tree.type) {
      tree.text = tree.text.trimStart();
      if (!tree.text) {
        return null;
      }
    }
  } else if (!tree.type && tree.children && tree.children.length > 0) {
    const c = lTrim(tree.children[0] ?? null);
    if (c) {
      tree.children[0] = c;
    } else {
      tree.children.shift();
      if (tree.children.length === 0) {
        return null;
      }
    }
  }
  return tree;
}

function attachmentsToEnd(
  tree: DraftyNode | null,
  limit: number
): DraftyNode | null {
  if (!tree) {
    return null;
  }

  if (tree.att) {
    tree.text = ' ';
    delete tree.att;
    delete tree.children;
  } else if (tree.children) {
    const attachments: DraftyNode[] = [];
    const children: DraftyNode[] = [];
    for (const c of tree.children) {
      if (c.att) {
        if (attachments.length === limit) {
          continue;
        }
        if (Drafty.isFormResponseType(c.data?.mime)) {
          continue;
        }

        delete c.att;
        delete c.children;
        c.text = ' ';
        attachments.push(c);
      } else {
        children.push(c);
      }
    }
    tree.children = children.concat(attachments);
  }
  return tree;
}

function extractEntities(line: string): ExtractedEntity[] {
  let extracted: ExtractedEntity[] = [];
  ENTITY_TYPES.forEach((entity) => {
    let match: RegExpExecArray | null;
    while ((match = entity.re.exec(line)) !== null) {
      extracted.push({
        offset: match.index,
        len: match[0].length,
        unique: match[0],
        data: entity.pack(match[0]),
        type: entity.name,
      });
    }
  });

  if (extracted.length === 0) {
    return extracted;
  }

  extracted.sort((a, b) => a.offset - b.offset);

  let idx = -1;
  extracted = extracted.filter((el) => {
    const result = el.offset > idx;
    idx = el.offset + el.len;
    return result;
  });

  return extracted;
}

function draftify(
  chunks: Chunk[] | undefined,
  startAt: number
): { txt: string; fmt: DraftyFmt[] } {
  let plain = '';
  let ranges: DraftyFmt[] = [];
  for (const chunk of chunks || []) {
    if (!chunk.txt) {
      const drafty = draftify(chunk.children, plain.length + startAt);
      chunk.txt = drafty.txt;
      ranges = ranges.concat(drafty.fmt);
    }

    if (chunk.tp) {
      ranges.push({
        at: plain.length + startAt,
        len: chunk.txt.length,
        tp: chunk.tp,
      });
    }

    plain += chunk.txt;
  }
  return { txt: plain, fmt: ranges };
}

function copyEntField<K extends AllowedEntField>(
  src: DraftyEntData,
  dst: DraftyEntData,
  key: K
): void {
  dst[key] = src[key];
}

function copyEntData(
  data: DraftyEntData | undefined,
  light?: boolean,
  allow?: AllowedEntField[] | null
): DraftyEntData | null {
  if (!data || Object.entries(data).length === 0) {
    return null;
  }

  const allowed = allow || [];
  const dc: DraftyEntData = {};
  ALLOWED_ENT_FIELDS.forEach((key) => {
    const value: unknown = data[key];
    if (!value) {
      return;
    }
    if (
      light &&
      !allowed.includes(key) &&
      (typeof value === 'string' || Array.isArray(value)) &&
      value.length > MAX_PREVIEW_DATA_SIZE
    ) {
      return;
    }
    if (typeof value === 'object') {
      return;
    }
    copyEntField(data, dc, key);
  });

  return Object.keys(dc).length !== 0 ? dc : null;
}

function graphemeIndices(graphemes: GraphemeSegment[]): number[] {
  const result: number[] = [];
  let charIndex = 0;

  graphemes.forEach(({ segment }, graphemeIndex) => {
    for (let i = 0; i < segment.length; i++) {
      result[charIndex + i] = graphemeIndex;
    }
    charIndex += segment.length;
  });

  return result;
}

function toGraphemeValues(
  fmt: DraftyFmt,
  segments: GraphemeSegment[],
  txt: string
): { at: number; len: number } {
  const indices = graphemeIndices(segments);
  const at = toInt(fmt.at);
  const len = toInt(fmt.len);

  const correctAt = indices[at] ?? indices.length;
  const correctLen =
    at + len <= txt.length
      ? (indices[at + len - 1] ?? indices.length) - correctAt
      : len;

  return { at: correctAt, len: correctLen + 1 };
}

function stringToGraphemes(str: string): GraphemeSegment[] {
  return splitGraphemes(str);
}
