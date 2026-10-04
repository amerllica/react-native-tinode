export interface GraphemeSegment {
  readonly segment: string;
  readonly index: number;
}

type CodePointRange = readonly [number, number];
type CodePointTest = (codePoint: number) => boolean;

const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const ZERO_WIDTH_JOINER = 0x200d;

const COMBINING_MARK_RANGES: readonly CodePointRange[] = [
  [0x0300, 0x036f],
  [0x0483, 0x0489],
  [0x0591, 0x05bd],
  [0x0610, 0x061a],
  [0x064b, 0x065f],
  [0x0900, 0x0903],
  [0x093a, 0x094f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe00, 0xfe0f],
  [0xfe20, 0xfe2f],
  [0xe0100, 0xe01ef],
];

const PICTOGRAPHIC_RANGES: readonly CodePointRange[] = [
  [0x00a9, 0x00a9],
  [0x00ae, 0x00ae],
  [0x203c, 0x203c],
  [0x2049, 0x2049],
  [0x2122, 0x2122],
  [0x2139, 0x2139],
  [0x2194, 0x21aa],
  [0x231a, 0x23ff],
  [0x24c2, 0x24c2],
  [0x25aa, 0x25fe],
  [0x2600, 0x27bf],
  [0x2934, 0x2935],
  [0x2b05, 0x2b55],
  [0x3030, 0x3030],
  [0x303d, 0x303d],
  [0x3297, 0x3297],
  [0x3299, 0x3299],
  [0x1f000, 0x1faff],
  [0x1fc00, 0x1fffd],
];

const REGIONAL_INDICATOR: CodePointRange = [0x1f1e6, 0x1f1ff];
const EMOJI_MODIFIER: CodePointRange = [0x1f3fb, 0x1f3ff];
const TAG_CHARACTER: CodePointRange = [0xe0020, 0xe007f];

function inRange(codePoint: number, [low, high]: CodePointRange): boolean {
  return codePoint >= low && codePoint <= high;
}

function unicodePropertyTest(
  property: string,
  fallback: readonly CodePointRange[]
): CodePointTest {
  try {
    const pattern = new RegExp(`^\\p{${property}}$`, 'u');
    return (codePoint) => pattern.test(String.fromCodePoint(codePoint));
  } catch {
    return (codePoint) => fallback.some((range) => inRange(codePoint, range));
  }
}

const isCombiningMark = unicodePropertyTest('M', COMBINING_MARK_RANGES);
const isPictographic = unicodePropertyTest(
  'Extended_Pictographic',
  PICTOGRAPHIC_RANGES
);

function isControl(codePoint: number): boolean {
  return codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function isRegionalIndicator(codePoint: number): boolean {
  return inRange(codePoint, REGIONAL_INDICATOR);
}

function isClusterExtender(codePoint: number): boolean {
  return (
    codePoint === ZERO_WIDTH_JOINER ||
    isCombiningMark(codePoint) ||
    inRange(codePoint, EMOJI_MODIFIER) ||
    inRange(codePoint, TAG_CHARACTER)
  );
}

function continuesCluster(
  previous: number,
  current: number,
  regionalIndicatorRun: number
): boolean {
  if (previous === CARRIAGE_RETURN) {
    return current === LINE_FEED;
  }
  if (isControl(previous) || isControl(current)) {
    return false;
  }
  if (isClusterExtender(current)) {
    return true;
  }
  if (previous === ZERO_WIDTH_JOINER) {
    return isPictographic(current);
  }
  return isRegionalIndicator(current) && regionalIndicatorRun % 2 === 1;
}

export function splitGraphemesFallback(str: string): GraphemeSegment[] {
  const segments: GraphemeSegment[] = [];
  let segment = '';
  let segmentStart = 0;
  let offset = 0;
  let previous = -1;
  let regionalIndicatorRun = 0;

  for (const char of str) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (
      segment &&
      continuesCluster(previous, codePoint, regionalIndicatorRun)
    ) {
      segment += char;
    } else {
      if (segment) {
        segments.push({ segment, index: segmentStart });
      }
      segment = char;
      segmentStart = offset;
    }
    regionalIndicatorRun = isRegionalIndicator(codePoint)
      ? regionalIndicatorRun + 1
      : 0;
    previous = codePoint;
    offset += char.length;
  }

  if (segment) {
    segments.push({ segment, index: segmentStart });
  }
  return segments;
}

function createNativeSegmenter(): Intl.Segmenter | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null;
  }
  return new Intl.Segmenter();
}

const nativeSegmenter = createNativeSegmenter();

export function splitGraphemes(str: string): GraphemeSegment[] {
  if (!nativeSegmenter) {
    return splitGraphemesFallback(str);
  }
  return Array.from(nativeSegmenter.segment(str), ({ segment, index }) => ({
    segment,
    index,
  }));
}
