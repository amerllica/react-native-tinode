import { defineGlobalIfMissing } from './define-global';
import { decodeUtf8 } from './utf8';

const UTF8_LABELS = ['utf-8', 'utf8', 'unicode-1-1-utf-8'];

class Utf8TextDecoder {
  readonly encoding = 'utf-8';

  constructor(label: string = 'utf-8') {
    if (!UTF8_LABELS.includes(label.trim().toLowerCase())) {
      throw new RangeError(`Unsupported encoding: ${label}`);
    }
  }

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) {
      return '';
    }
    if (ArrayBuffer.isView(input)) {
      return decodeUtf8(
        new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
      );
    }
    return decodeUtf8(new Uint8Array(input));
  }
}

export function installTextDecoder(): void {
  defineGlobalIfMissing(globalThis, 'TextDecoder', Utf8TextDecoder);
}
