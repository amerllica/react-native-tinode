import { describe, expect, jest, test } from '@jest/globals';
import { installTextDecoder } from '../text-decoder';

const nativeDecoder = globalThis.TextDecoder;

function withoutNativeDecoder(run: () => void): void {
  Reflect.deleteProperty(globalThis, 'TextDecoder');
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, 'TextDecoder', {
      value: nativeDecoder,
      configurable: true,
      writable: true,
    });
  }
}

describe('installTextDecoder', () => {
  test('adds a UTF-8 decoder when there is none', () => {
    withoutNativeDecoder(() => {
      installTextDecoder();
      const decoder = new TextDecoder('utf-8');
      const bytes = new Uint8Array([
        0x63, 0x61, 0x66, 0xc3, 0xa9, 0x20, 0xe2, 0x82, 0xac, 0x20, 0xf0, 0x9f,
        0x98, 0x80,
      ]);
      expect(decoder.decode(bytes)).toBe('café € 😀');
      expect(decoder.decode(bytes.buffer)).toBe('café € 😀');
      expect(decoder.decode(new Uint8Array([0x61, 0x80, 0x62]))).toBe('a�b');
      expect(decoder.decode()).toBe('');
      expect(() => new TextDecoder('utf-16le')).toThrow(RangeError);
    });
  });

  test('keeps the native decoder', () => {
    installTextDecoder();
    expect(globalThis.TextDecoder).toBe(nativeDecoder);
  });

  test('lets tinode-sdk decode a UTF-8 vCard without a native decoder', () => {
    withoutNativeDecoder(() => {
      jest.isolateModules(() => {
        require('..');
        const { TheCard } = require('tinode-sdk');
        const vcard =
          'BEGIN:VCARD\r\nFN;ENCODING=QUOTED-PRINTABLE:=D8=B9=D9=84=DB=8C =E2=82=AC =F0=9F=98=80 caf=C3=A9\r\nEND:VCARD';
        expect(TheCard.importVCard(vcard)?.fn).toBe('علی € \u{1F600} café');
      });
    });
  });
});
