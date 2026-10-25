import { describe, expect, jest, test } from '@jest/globals';
import { installIntlSegmenter } from '../intl-segmenter';

const nativeSegmenter = Intl.Segmenter;

function withoutNativeSegmenter(run: () => void): void {
  Reflect.deleteProperty(Intl, 'Segmenter');
  try {
    run();
  } finally {
    Object.defineProperty(Intl, 'Segmenter', {
      value: nativeSegmenter,
      configurable: true,
      writable: true,
    });
  }
}

describe('installIntlSegmenter', () => {
  test('adds a grapheme segmenter when Intl has none', () => {
    withoutNativeSegmenter(() => {
      installIntlSegmenter();
      const input = 'a👍🏽b';
      expect(Array.from(new Intl.Segmenter().segment(input))).toEqual([
        { segment: 'a', index: 0, input },
        { segment: '👍🏽', index: 1, input },
        { segment: 'b', index: 5, input },
      ]);
      expect(new Intl.Segmenter().resolvedOptions().granularity).toBe(
        'grapheme'
      );
    });
  });

  test('rejects granularities other than grapheme', () => {
    withoutNativeSegmenter(() => {
      installIntlSegmenter();
      expect(() => new Intl.Segmenter('fa', { granularity: 'word' })).toThrow(
        RangeError
      );
      expect(new Intl.Segmenter('fa').resolvedOptions().locale).toBe('fa');
      expect(new Intl.Segmenter().resolvedOptions().locale).toBe('en');
    });
  });

  test('finds the segment that contains a code unit', () => {
    withoutNativeSegmenter(() => {
      installIntlSegmenter();
      const input = 'a👍🏽b';
      const segments = new Intl.Segmenter().segment(input);
      expect(segments.containing(3)).toEqual({
        segment: '👍🏽',
        index: 1,
        input,
      });
      expect(segments.containing(9)).toBeUndefined();
    });
  });

  test('keeps the native segmenter', () => {
    installIntlSegmenter();
    expect(Intl.Segmenter).toBe(nativeSegmenter);
  });

  test('lets tinode-sdk load before Intl.Segmenter exists natively', () => {
    withoutNativeSegmenter(() => {
      jest.isolateModules(() => {
        require('..');
        const { Drafty } = require('tinode-sdk');
        expect(Drafty.parse('*bold* 👍🏽').txt).toBe('bold 👍🏽');
      });
    });
  });
});
