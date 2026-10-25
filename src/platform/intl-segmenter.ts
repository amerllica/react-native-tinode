import { splitGraphemes } from './graphemes';

interface GraphemeSegmentData {
  segment: string;
  index: number;
  input: string;
}

class GraphemeSegmenter {
  segment(input: string): GraphemeSegmentData[] {
    return splitGraphemes(input).map(({ segment, index }) => ({
      segment,
      index,
      input,
    }));
  }

  resolvedOptions(): { locale: string; granularity: 'grapheme' } {
    return { locale: 'en', granularity: 'grapheme' };
  }
}

export function installIntlSegmenter(): void {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'function') {
    return;
  }
  Object.defineProperty(Intl, 'Segmenter', {
    value: GraphemeSegmenter,
    configurable: true,
    writable: true,
  });
}
