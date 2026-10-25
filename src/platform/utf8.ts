const REPLACEMENT_CHAR = '\uFFFD';

function continuationCount(lead: number): number {
  if (lead < 0x80) return 0;
  if (lead >= 0xc2 && lead <= 0xdf) return 1;
  if (lead >= 0xe0 && lead <= 0xef) return 2;
  if (lead >= 0xf0 && lead <= 0xf4) return 3;
  return -1;
}

export function decodeUtf8(bytes: Uint8Array): string {
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
