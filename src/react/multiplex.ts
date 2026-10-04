type AnyFunction = (...args: never[]) => unknown;

export type CallbackSlot<T> = {
  [K in keyof T]-?: K extends `on${string}`
    ? NonNullable<T[K]> extends AnyFunction
      ? K
      : never
    : never;
}[keyof T];

interface Listener {
  readonly fn: unknown;
}

interface Slot {
  primary: unknown;
  readonly wasOwnProperty: boolean;
  readonly listeners: Set<Listener>;
}

const slotsByTarget = new WeakMap<object, Map<PropertyKey, Slot>>();

export function attach<T extends object, K extends CallbackSlot<T>>(
  target: T,
  slotName: K,
  fn: NonNullable<T[K]>
): () => void {
  const slot = slotFor(target, slotName);
  const listener: Listener = { fn };
  slot.listeners.add(listener);

  return () => {
    if (!slot.listeners.delete(listener) || slot.listeners.size > 0) {
      return;
    }
    restore(target, slotName, slot);
  };
}

function slotFor(target: object, slotName: PropertyKey): Slot {
  let slots = slotsByTarget.get(target);
  if (!slots) {
    slots = new Map();
    slotsByTarget.set(target, slots);
  }
  const existing = slots.get(slotName);
  if (existing) {
    return existing;
  }
  const slot = install(target, slotName);
  slots.set(slotName, slot);
  return slot;
}

function install(target: object, slotName: PropertyKey): Slot {
  const slot: Slot = {
    primary: Reflect.get(target, slotName),
    wasOwnProperty: Object.prototype.hasOwnProperty.call(target, slotName),
    listeners: new Set(),
  };

  const dispatch = (...args: unknown[]) => {
    invoke(slot.primary, target, args);
    for (const listener of [...slot.listeners]) {
      invoke(listener.fn, target, args);
    }
  };

  Object.defineProperty(target, slotName, {
    configurable: true,
    enumerable: true,
    get: () => dispatch,
    set: (value: unknown) => {
      slot.primary = value;
    },
  });

  return slot;
}

function restore(target: object, slotName: PropertyKey, slot: Slot): void {
  slotsByTarget.get(target)?.delete(slotName);
  if (slot.wasOwnProperty) {
    Object.defineProperty(target, slotName, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: slot.primary,
    });
  } else {
    Reflect.deleteProperty(target, slotName);
  }
}

function invoke(fn: unknown, self: object, args: unknown[]): void {
  if (typeof fn === 'function') {
    Reflect.apply(fn, self, args);
  }
}
