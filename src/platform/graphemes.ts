export interface GraphemeSegment {
  readonly segment: string;
  readonly index: number;
}

type CodePointRange = readonly [number, number];

const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const ZERO_WIDTH_JOINER = 0x200d;

const REGIONAL_INDICATOR: CodePointRange = [0x1f1e6, 0x1f1ff];
const EMOJI_MODIFIER: CodePointRange = [0x1f3fb, 0x1f3ff];
const TAG_CHARACTER: CodePointRange = [0xe0020, 0xe007f];

const COMBINING_MARK = /^\p{M}$/u;
const PICTOGRAPHIC = /^\p{Extended_Pictographic}$/u;

function inRange(codePoint: number, [low, high]: CodePointRange): boolean {
  return codePoint >= low && codePoint <= high;
}

function isCombiningMark(codePoint: number): boolean {
  return COMBINING_MARK.test(String.fromCodePoint(codePoint));
}

function isPictographic(codePoint: number): boolean {
  return PICTOGRAPHIC.test(String.fromCodePoint(codePoint));
}

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

export function splitGraphemes(str: string): GraphemeSegment[] {
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
