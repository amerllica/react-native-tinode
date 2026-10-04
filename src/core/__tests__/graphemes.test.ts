import { describe, expect, test } from '@jest/globals';

import { splitGraphemes, splitGraphemesFallback } from '../graphemes';

const segmentsOf = (str: string) =>
  splitGraphemesFallback(str).map(({ segment }) => segment);

describe('splitGraphemesFallback', () => {
  test('plain ASCII and Cyrillic', () => {
    expect(segmentsOf('abc')).toEqual(['a', 'b', 'c']);
    expect(segmentsOf('жЫр')).toEqual(['ж', 'Ы', 'р']);
    expect(segmentsOf('')).toEqual([]);
  });

  test('surrogate pairs', () => {
    expect(segmentsOf('a😀b')).toEqual(['a', '😀', 'b']);
    expect(segmentsOf('𝒳𝒴')).toEqual(['𝒳', '𝒴']);
  });

  test('combining marks', () => {
    expect(segmentsOf('éx')).toEqual(['é', 'x']);
    expect(segmentsOf('ạ̈b')).toEqual(['ạ̈', 'b']);
  });

  test('variation selectors', () => {
    expect(segmentsOf('❤️!')).toEqual(['❤️', '!']);
    expect(segmentsOf('🕯️ x')).toEqual(['🕯️', ' ', 'x']);
  });

  test('skin tone modifiers', () => {
    expect(segmentsOf('Hi👋🏼Hi')).toEqual(['H', 'i', '👋🏼', 'H', 'i']);
  });

  test('ZWJ sequences', () => {
    expect(segmentsOf('b1👩🏽‍✈️b2')).toEqual(['b', '1', '👩🏽‍✈️', 'b', '2']);
    expect(segmentsOf('👨‍👩‍👧‍👦')).toEqual(['👨‍👩‍👧‍👦']);
  });

  test('ZWJ before a letter does not glue the letter', () => {
    expect(segmentsOf('a‍b')).toEqual(['a‍', 'b']);
  });

  test('regional indicator flags pair up', () => {
    expect(segmentsOf('🇺🇸🇫🇷')).toEqual(['🇺🇸', '🇫🇷']);
    expect(segmentsOf('🇺🇸🇫')).toEqual(['🇺🇸', '🇫']);
  });

  test('tag sequence flags', () => {
    const england = '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
    expect(segmentsOf(england + 'x')).toEqual([england, 'x']);
  });

  test('keycaps', () => {
    expect(segmentsOf('1️⃣#️⃣')).toEqual(['1️⃣', '#️⃣']);
  });

  test('CRLF stays together, other controls split', () => {
    expect(segmentsOf('a\r\nb')).toEqual(['a', '\r\n', 'b']);
    expect(segmentsOf('\ń')).toEqual(['\n', '́']);
  });

  test('segment index is the UTF-16 offset', () => {
    expect(splitGraphemesFallback('a😀👋🏼b')).toEqual([
      { segment: 'a', index: 0 },
      { segment: '😀', index: 1 },
      { segment: '👋🏼', index: 3 },
      { segment: 'b', index: 7 },
    ]);
  });

  test('matches Intl.Segmenter on mixed text', () => {
    const samples = [
      'Это *жЫрный*, `код` и _наклонный_',
      '😀 b1👩🏽‍✈️b2 smile 123',
      'Hi 👋🏼 Visit http://localhost:6060',
      '🔴Hello🔴 🟠Hello🟠 🇩🇪🇯🇵',
      'café 1️⃣ 👨‍👩‍👧‍👦 ❤️',
    ];
    const segmenter = new Intl.Segmenter();
    for (const sample of samples) {
      const expected = Array.from(segmenter.segment(sample), (s) => s.segment);
      expect(segmentsOf(sample)).toEqual(expected);
    }
  });
});

describe('splitGraphemes', () => {
  test('returns segments with offsets', () => {
    expect(splitGraphemes('a👋🏼')).toEqual([
      { segment: 'a', index: 0 },
      { segment: '👋🏼', index: 1 },
    ]);
  });
});
