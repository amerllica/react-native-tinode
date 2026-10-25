import { defineGlobalIfMissing } from './define-global';
import { splitGraphemes } from './graphemes';

const DEFAULT_LOCALE = 'en';

interface GraphemeSegmentData {
  segment: string;
  index: number;
  input: string;
}

interface GraphemeSegmenterOptions {
  granularity?: string;
}

class GraphemeSegments implements Iterable<GraphemeSegmentData> {
  readonly #segments: GraphemeSegmentData[];

  constructor(input: string) {
    this.#segments = splitGraphemes(input).map(({ segment, index }) => ({
      segment,
      index,
      input,
    }));
  }

  containing(codeUnitIndex = 0): GraphemeSegmentData | undefined {
    return this.#segments.find(
      ({ segment, index }) =>
        codeUnitIndex >= index && codeUnitIndex < index + segment.length
    );
  }

  [Symbol.iterator](): Iterator<GraphemeSegmentData> {
    return this.#segments[Symbol.iterator]();
  }
}

class GraphemeSegmenter {
  readonly #locale: string;

  constructor(
    locales?: string | readonly string[],
    options?: GraphemeSegmenterOptions
  ) {
    const granularity = options?.granularity ?? 'grapheme';
    if (granularity !== 'grapheme') {
      throw new RangeError(`Unsupported granularity: ${granularity}`);
    }
    this.#locale = [locales ?? []].flat()[0] ?? DEFAULT_LOCALE;
  }

  segment(input: string): GraphemeSegments {
    return new GraphemeSegments(input);
  }

  resolvedOptions(): { locale: string; granularity: 'grapheme' } {
    return { locale: this.#locale, granularity: 'grapheme' };
  }
}

export function installIntlSegmenter(): void {
  if (typeof Intl === 'undefined') {
    return;
  }
  defineGlobalIfMissing(Intl, 'Segmenter', GraphemeSegmenter);
}
