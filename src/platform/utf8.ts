type ByteRange = readonly [number, number];

const REPLACEMENT_CHAR = '�';
const BYTE_ORDER_MARK = '﻿';
const CONTINUATION: ByteRange = [0x80, 0xbf];
const CONTINUATION_BITS = 64;
const LEAD_PAYLOAD_SIZE = [0x80, 0x20, 0x10, 0x08];
const SECOND_BYTE_BY_LEAD = new Map<number, ByteRange>([
  [0xe0, [0xa0, 0xbf]],
  [0xed, [0x80, 0x9f]],
  [0xf0, [0x90, 0xbf]],
  [0xf4, [0x80, 0x8f]],
]);

function continuationCount(lead: number): number {
  if (lead < 0x80) return 0;
  if (lead >= 0xc2 && lead <= 0xdf) return 1;
  if (lead >= 0xe0 && lead <= 0xef) return 2;
  if (lead >= 0xf0 && lead <= 0xf4) return 3;
  return -1;
}

function inRange(
  byte: number | undefined,
  [low, high]: ByteRange
): byte is number {
  return byte !== undefined && byte >= low && byte <= high;
}

function continuationRange(lead: number, position: number): ByteRange {
  return position === 1
    ? (SECOND_BYTE_BY_LEAD.get(lead) ?? CONTINUATION)
    : CONTINUATION;
}

function decodeBytes(bytes: Uint8Array): string {
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
    let codePoint = lead % (LEAD_PAYLOAD_SIZE[extra] ?? 1);
    let consumed = 1;
    while (consumed <= extra) {
      const next = bytes[i + consumed];
      if (!inRange(next, continuationRange(lead, consumed))) {
        break;
      }
      codePoint = codePoint * CONTINUATION_BITS + (next - CONTINUATION[0]);
      consumed++;
    }
    result +=
      consumed > extra ? String.fromCodePoint(codePoint) : REPLACEMENT_CHAR;
    i += consumed;
  }
  return result;
}

export function decodeUtf8(bytes: Uint8Array): string {
  const text = decodeBytes(bytes);
  return text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
}
