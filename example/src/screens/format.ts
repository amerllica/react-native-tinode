export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function cardName(card: unknown, fallback: string): string {
  if (
    typeof card === 'object' &&
    card !== null &&
    'fn' in card &&
    typeof card.fn === 'string' &&
    card.fn.trim()
  ) {
    return card.fn;
  }
  return fallback;
}

export function messageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (
    typeof content === 'object' &&
    content !== null &&
    'txt' in content &&
    typeof content.txt === 'string' &&
    content.txt
  ) {
    return content.txt;
  }
  return '[attachment]';
}

export function shortTime(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
