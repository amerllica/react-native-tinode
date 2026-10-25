export function defineGlobalIfMissing(
  target: object,
  key: string,
  value: unknown
): void {
  if (Reflect.has(target, key)) {
    return;
  }
  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  });
}
