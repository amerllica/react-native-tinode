import { DEL_CHAR } from './config';

const THE_CARD_MIME_TYPE = 'text/x-the-card';
const REPLACEMENT_CHAR = '�';
const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';
const DATA_URL_PATTERN = /^data:(image\/[-a-z0-9+.]+)?(;base64)?,/i;
const HEX_BYTE_PATTERN = /^[0-9A-F]{2}$/i;

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export type CardCommProto = 'tel' | 'email' | 'tinode' | 'http' | 'impp';

export interface CardName {
  surname?: string;
  given?: string;
  additional?: string;
  prefix?: string;
  suffix?: string;
}

export interface CardOrg {
  fn?: string;
  title?: string;
}

export interface CardPhoto {
  type?: string;
  data?: string;
  ref?: string;
}

export interface CardBirthday {
  y?: number;
  m: number;
  d: number;
}

export interface CardComm {
  proto: CardCommProto;
  des: string[];
  value: string;
}

export interface CardData {
  fn?: string;
  n?: CardName;
  org?: CardOrg;
  note?: string;
  bday?: CardBirthday;
  photo?: CardPhoto | typeof DEL_CHAR;
  comm?: CardComm[];
}

type MaybeCard = CardData | null | undefined;

export default interface TheCard extends CardData {}

export default class TheCard {
  static contentType = THE_CARD_MIME_TYPE;

  constructor(
    fn?: string,
    imageUrl?: string,
    imageMimeType?: string,
    note?: string
  ) {
    Object.assign(this, theCard(fn, imageUrl, imageMimeType, note) ?? {});
  }

  merge(other: CardData) {
    Object.assign(this, other);
  }

  get contentType(): string {
    return THE_CARD_MIME_TYPE;
  }

  get size(): number {
    return JSON.stringify(this).length;
  }

  static setFn(card: MaybeCard, fn?: string | null): CardData {
    const result = card ?? {};
    result.fn = fn?.trim() || undefined;
    return result;
  }

  static getFn(card: MaybeCard): string | null {
    return card?.fn ? card.fn : null;
  }

  static setNote(card: MaybeCard, note?: string | null): CardData {
    const result = card ?? {};
    result.note = note?.trim() || DEL_CHAR;
    return result;
  }

  static setPhoto(
    card: MaybeCard,
    imageUrl?: string | null,
    imageMimeType?: string | null
  ): CardData {
    const result = card ?? {};
    if (!imageUrl) {
      result.photo = DEL_CHAR;
      return result;
    }
    const dataUrl = DATA_URL_PATTERN.exec(imageUrl);
    let mimeType: string | null | undefined = imageMimeType;
    let photo: CardPhoto;
    if (dataUrl) {
      mimeType = dataUrl[1];
      photo = {
        data: imageUrl.substring(imageUrl.indexOf(',') + 1),
        ref: DEL_CHAR,
      };
    } else {
      photo = { data: DEL_CHAR, ref: imageUrl };
      mimeType = mimeType || mimeTypeFromExtension(imageUrl);
    }
    photo.type = imageSubtype(mimeType);
    result.photo = photo;
    return result;
  }

  static getPhotoUrl(card: MaybeCard): string | null {
    const photo = card?.photo;
    if (!photo || typeof photo === 'string') {
      return null;
    }
    if (photo.ref && photo.ref !== DEL_CHAR) {
      return photo.ref;
    }
    if (photo.data && photo.data !== DEL_CHAR) {
      return `data:image/${photo.type || 'jpeg'};base64,${photo.data}`;
    }
    return null;
  }

  static getOrg(card: MaybeCard): string | null {
    return card?.org?.fn || null;
  }

  static setPhone(card: MaybeCard, phone: string, type = 'voice'): CardData {
    return addOrSetComm(card, 'tel', phone, type, true);
  }

  static setEmail(card: MaybeCard, email: string, type = 'home'): CardData {
    return addOrSetComm(card, 'email', email, type, true);
  }

  static setTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type = 'home'
  ): CardData {
    return addOrSetComm(card, 'tinode', tinodeID, type, true);
  }

  static addPhone(card: MaybeCard, phone: string, type = 'voice'): CardData {
    return addOrSetComm(card, 'tel', phone, type, false);
  }

  static addEmail(card: MaybeCard, email: string, type = 'home'): CardData {
    return addOrSetComm(card, 'email', email, type, false);
  }

  static addTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type = 'home'
  ): CardData {
    return addOrSetComm(card, 'tinode', tinodeID, type, false);
  }

  static clearPhone<T extends MaybeCard>(
    card: T,
    phone?: string,
    type?: string
  ): T {
    return clearComm(card, 'tel', phone, type);
  }

  static clearEmail<T extends MaybeCard>(
    card: T,
    email?: string,
    type?: string
  ): T {
    return clearComm(card, 'email', email, type);
  }

  static clearTinodeID<T extends MaybeCard>(
    card: T,
    tinodeID?: string,
    type?: string
  ): T {
    return clearComm(card, 'tinode', tinodeID, type);
  }

  static getComm(card: MaybeCard, proto: string): CardComm[] {
    if (card && Array.isArray(card.comm)) {
      return card.comm.filter((c) => c.proto === proto);
    }
    return [];
  }

  static getEmails(card: MaybeCard): string[] {
    return TheCard.getComm(card, 'email').map((c) => c.value);
  }

  static getPhones(card: MaybeCard): string[] {
    return TheCard.getComm(card, 'tel').map((c) => c.value);
  }

  static getFirstTinodeID(card: MaybeCard): string | null {
    return TheCard.getComm(card, 'tinode')[0]?.value ?? null;
  }

  static exportVCard(card: MaybeCard): string | null {
    if (!card) {
      return null;
    }

    let vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';

    if (card.fn) {
      vcard += `FN:${card.fn}\r\n`;
    }

    if (card.n) {
      vcard += `N:${card.n.surname || ''};${card.n.given || ''};${card.n.additional || ''};${card.n.prefix || ''};${card.n.suffix || ''}\r\n`;
    }

    if (card.org) {
      if (card.org.fn) {
        vcard += `ORG:${card.org.fn}\r\n`;
      }
      if (card.org.title) {
        vcard += `TITLE:${card.org.title}\r\n`;
      }
    }

    if (card.note && card.note !== DEL_CHAR) {
      vcard += `NOTE:${card.note}\r\n`;
    }

    if (card.bday && card.bday.m && card.bday.d) {
      const year = card.bday.y ? String(card.bday.y).padStart(4, '0') : '--';
      const month = String(card.bday.m).padStart(2, '0');
      const day = String(card.bday.d).padStart(2, '0');
      vcard += `BDAY:${year}-${month}-${day}\r\n`;
    }

    if (card.photo && typeof card.photo !== 'string') {
      const { ref, data, type } = card.photo;
      if (ref && ref !== DEL_CHAR) {
        vcard += `PHOTO;VALUE=URI:${ref}\r\n`;
      } else if (data && data !== DEL_CHAR) {
        vcard += `PHOTO;TYPE=${(type ?? '').toUpperCase()};ENCODING=b:${data}\r\n`;
      }
    }

    if (Array.isArray(card.comm)) {
      card.comm.forEach((comm) => {
        const types = comm.des.join(',').toUpperCase();
        const property = VCARD_PROPERTY_BY_PROTO[comm.proto];
        if (property) {
          vcard += `${property};TYPE=${types}:${comm.value}\r\n`;
        }
      });
    }

    vcard += 'END:VCARD\r\n';
    return vcard;
  }

  static importVCard(vcardStr: unknown): CardData | null {
    if (!vcardStr || typeof vcardStr !== 'string') {
      return null;
    }

    const card: CardData = {};
    const commMap = new Map<string, Set<string>>();

    unfoldLines(vcardStr).forEach((line) => {
      const [keyPart, ...valueParts] = line.split(':');
      if (!keyPart || valueParts.length === 0) {
        return;
      }
      const rawValue = valueParts.join(':');
      const keyParams = keyPart.split(';');
      const key = (keyParams[0] ?? '').trim().toUpperCase();
      const isQuotedPrintable = keyParams.some((param) => {
        const normalized = param.trim().toUpperCase();
        return (
          normalized === 'QUOTED-PRINTABLE' ||
          normalized === 'ENCODING=QUOTED-PRINTABLE'
        );
      });
      const textValue = isQuotedPrintable
        ? decodeQuotedPrintable(rawValue)
        : rawValue;

      switch (key) {
        case 'FN':
          card.fn = unescapeValue(textValue);
          break;
        case 'N':
          assignName(card, textValue);
          break;
        case 'ORG': {
          const org = card.org ?? {};
          const name = textValue.split(';')[0];
          if (name) {
            org.fn = unescapeValue(name);
          } else {
            delete org.fn;
          }
          card.org = org;
          break;
        }
        case 'TITLE': {
          const org = card.org ?? {};
          if (textValue) {
            org.title = unescapeValue(textValue);
          } else {
            delete org.title;
          }
          card.org = org;
          break;
        }
        case 'NOTE':
          card.note = unescapeValue(textValue);
          break;
        case 'BDAY': {
          const bday = parseBirthday(rawValue);
          if (bday) {
            card.bday = bday;
          }
          break;
        }
        case 'PHOTO':
          card.photo = parsePhoto(keyPart, rawValue);
          break;
        case 'TEL':
          collectComm(commMap, `tel|${rawValue}`, keyPart);
          break;
        case 'EMAIL':
          collectComm(commMap, `email|${rawValue}`, keyPart);
          break;
        case 'IMPP':
          collectComm(
            commMap,
            rawValue.startsWith('tinode:')
              ? `tinode|${rawValue}`
              : `impp|${rawValue}`,
            keyPart
          );
          break;
        case 'URL':
          collectComm(commMap, `http|${rawValue}`, keyPart);
          break;
        default:
          break;
      }
    });

    if (commMap.size > 0) {
      card.comm = [];
      commMap.forEach((types, mapKey) => {
        const [proto, value] = mapKey.split('|', 2);
        if (isCommProto(proto) && value !== undefined) {
          card.comm?.push({ proto, des: Array.from(types), value });
        }
      });
    }

    return card;
  }

  static isFileSupported(type?: string | null, name?: string | null): boolean {
    return (
      type === 'text/vcard' ||
      (name ?? '').endsWith('.vcf') ||
      (name ?? '').endsWith('.vcard')
    );
  }
}

const VCARD_PROPERTY_BY_PROTO: Partial<Record<CardCommProto, string>> = {
  tel: 'TEL',
  email: 'EMAIL',
  tinode: 'IMPP',
  http: 'URL',
};

function isCommProto(value: string | undefined): value is CardCommProto {
  return (
    value === 'tel' ||
    value === 'email' ||
    value === 'tinode' ||
    value === 'http' ||
    value === 'impp'
  );
}

function imageSubtype(mimeType?: string | null): string {
  return (mimeType || DEFAULT_IMAGE_MIME_TYPE).substring('image/'.length);
}

function mimeTypeFromExtension(url: string): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(url);
  const extension = ext?.[1]?.toLowerCase();
  return (extension && IMAGE_MIME_BY_EXTENSION[extension]) || null;
}

function theCard(
  fn?: string,
  imageUrl?: string,
  imageMimeType?: string,
  note?: string
): CardData | null {
  let card: CardData | null = null;
  const name = fn?.trim();
  const trimmedNote = note?.trim();

  if (name) {
    card = { fn: name };
  }

  if (typeof trimmedNote === 'string') {
    card = card ?? {};
    card.note = trimmedNote || DEL_CHAR;
  }

  if (imageUrl) {
    card = TheCard.setPhoto(card, imageUrl, imageMimeType);
  }

  return card;
}

function addOrSetComm(
  card: MaybeCard,
  proto: CardCommProto,
  value: string,
  type: string,
  setOnly: boolean
): CardData {
  const result = card ?? {};
  const trimmed = value?.trim();
  if (trimmed) {
    let comm = result.comm ?? [];
    if (setOnly) {
      comm = comm.filter((c) => c.proto !== proto || !c.des.includes(type));
    }
    comm.push({ proto, des: [type], value: trimmed });
    result.comm = comm;
  }
  return result;
}

function clearComm<T extends MaybeCard>(
  card: T,
  proto: CardCommProto,
  value?: string,
  type?: string
): T {
  if (card && Array.isArray(card.comm)) {
    card.comm = card.comm.filter((c) => {
      if (c.proto !== proto) return true;
      if (value && c.value !== value) return true;
      if (type) {
        return !c.des.includes(type);
      }
      return false;
    });
  }
  return card;
}

function unfoldLines(vcardStr: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  vcardStr.split(/\r\n|\n/).forEach((line) => {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      currentLine += line.substring(1);
    } else if (currentLine.endsWith('=')) {
      currentLine = currentLine.substring(0, currentLine.length - 1) + line;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = line;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function unescapeValue(value: string): string {
  return value.replace(/\\([,;\\n])/g, (_match, char: string) =>
    char === 'n' ? '\n' : char
  );
}

function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < value.length) {
    const hex = value.substring(i + 1, i + 3);
    if (
      value[i] === '=' &&
      i + 2 < value.length &&
      HEX_BYTE_PATTERN.test(hex)
    ) {
      bytes.push(parseInt(hex, 16));
      i += 3;
    } else {
      bytes.push(value.charCodeAt(i));
      i++;
    }
  }
  return decodeUtf8(new Uint8Array(bytes));
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  return decodeUtf8Manually(bytes);
}

function continuationCount(lead: number): number {
  if (lead < 0x80) return 0;
  if (lead >= 0xc2 && lead <= 0xdf) return 1;
  if (lead >= 0xe0 && lead <= 0xef) return 2;
  if (lead >= 0xf0 && lead <= 0xf4) return 3;
  return -1;
}

function decodeUtf8Manually(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const lead = bytes[i] ?? 0;
    const extra = continuationCount(lead);
    if (extra < 0) {
      result += REPLACEMENT_CHAR;
      i++;
      continue;
    }
    let codePoint = extra === 0 ? lead : lead % 2 ** (6 - extra);
    let consumed = 1;
    let valid = true;
    for (let k = 1; k <= extra; k++) {
      const next = bytes[i + k];
      if (next === undefined || next < 0x80 || next > 0xbf) {
        valid = false;
        break;
      }
      codePoint = codePoint * 64 + (next - 0x80);
      consumed++;
    }
    const minimum = [0, 0x80, 0x800, 0x10000][extra] ?? 0;
    const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    if (!valid || codePoint < minimum || codePoint > 0x10ffff || isSurrogate) {
      result += REPLACEMENT_CHAR;
      i += valid ? consumed : Math.max(consumed, 1);
      continue;
    }
    result += String.fromCodePoint(codePoint);
    i += consumed;
  }
  return result;
}

function assignName(card: CardData, textValue: string) {
  const parts = textValue.split(';');
  const name: CardName = {};
  const fields: (keyof CardName)[] = [
    'surname',
    'given',
    'additional',
    'prefix',
    'suffix',
  ];
  fields.forEach((field, index) => {
    const part = parts[index];
    if (part) {
      name[field] = unescapeValue(part);
    }
  });
  if (Object.keys(name).length > 0) {
    card.n = name;
  } else {
    delete card.n;
  }
}

function parseTypes(keyPart: string): string[] {
  return keyPart
    .split(';')
    .filter((param) => param.trim().toUpperCase().startsWith('TYPE='))
    .flatMap((param) =>
      param
        .substring(param.indexOf('=') + 1)
        .split(',')
        .map((t) => {
          const cleaned = t.trim().toLowerCase();
          return cleaned.startsWith('type=') ? cleaned.substring(5) : cleaned;
        })
    )
    .filter((t) => t !== 'internet');
}

function collectComm(
  commMap: Map<string, Set<string>>,
  mapKey: string,
  keyPart: string
) {
  const collected = commMap.get(mapKey) ?? new Set<string>();
  parseTypes(keyPart).forEach((t) => collected.add(t));
  commMap.set(mapKey, collected);
}

function parsePhoto(keyPart: string, value: string): CardPhoto {
  let type = 'jpeg';
  let encoding: string | null = null;
  keyPart
    .split(';')
    .slice(1)
    .forEach((param) => {
      const [pKey, pValue] = param.split('=');
      const name = pKey?.trim().toUpperCase();
      if (name === 'TYPE') {
        type = pValue ? pValue.trim().toLowerCase() : 'jpeg';
      } else if (name === 'ENCODING') {
        encoding = pValue ? pValue.trim().toLowerCase() : null;
      }
    });
  return encoding === 'b'
    ? { type, data: value, ref: DEL_CHAR }
    : { type, data: DEL_CHAR, ref: value };
}

interface DateParts {
  year: number | null;
  month: number | null;
  day: number | null;
}

function parseDateParts(dateStr: string): DateParts {
  const noHyphens = dateStr.replace(/-/g, '');
  const parts: DateParts = { year: null, month: null, day: null };

  if (noHyphens.length === 6 && /^\d{6}$/.test(noHyphens)) {
    const yy = parseInt(noHyphens.substring(0, 2), 10);
    parts.month = parseInt(noHyphens.substring(2, 4), 10);
    parts.day = parseInt(noHyphens.substring(4, 6), 10);
    parts.year = yy >= 35 ? 1900 + yy : 2000 + yy;
  } else if (dateStr.startsWith('--')) {
    const cleaned = dateStr.replace(/^-+/, '');
    if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
      parts.month = parseInt(cleaned.substring(0, 2), 10);
      parts.day = parseInt(cleaned.substring(2, 4), 10);
    } else if (cleaned.includes('-')) {
      const pieces = cleaned.split('-');
      parts.month = parseInt(pieces[0] ?? '', 10);
      parts.day = parseInt(pieces[1] ?? '', 10);
    }
  } else if (noHyphens.length === 8 && /^\d{8}$/.test(noHyphens)) {
    parts.year = parseInt(noHyphens.substring(0, 4), 10);
    parts.month = parseInt(noHyphens.substring(4, 6), 10);
    parts.day = parseInt(noHyphens.substring(6, 8), 10);
  } else if (dateStr.includes('-')) {
    const pieces = dateStr.split('-');
    if (pieces[0] && !/^-+$/.test(pieces[0])) {
      parts.year = parseInt(pieces[0], 10);
    }
    if (pieces.length >= 2) {
      parts.month = parseInt(pieces[1] ?? '', 10);
    }
    if (pieces.length >= 3) {
      parts.day = parseInt(pieces[2] ?? '', 10);
    }
  }
  return parts;
}

function parseBirthday(value: string): CardBirthday | null {
  const dateStr = (value.split(/[T ]/)[0] ?? '').trim();
  const { year, month, day } = parseDateParts(dateStr);

  const isValidMonth = !!month && month >= 1 && month <= 12;
  const isValidDay = !!day && day >= 1 && day <= 31;
  const isValidYear = !year || (year >= 1800 && year <= 2200);

  if (!month || !day || !isValidMonth || !isValidDay || !isValidYear) {
    return null;
  }
  return year ? { y: year, m: month, d: day } : { m: month, d: day };
}
