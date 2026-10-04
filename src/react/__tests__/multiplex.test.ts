import { describe, expect, jest, test } from '@jest/globals';
import { attach } from '../multiplex';

class Emitter {
  onEvent?: (value: number) => void = undefined;
  onOther?: () => void = undefined;

  fire(value: number) {
    this.onEvent?.(value);
  }
}

describe('attach', () => {
  test('keeps the existing handler and calls every listener', () => {
    const emitter = new Emitter();
    const primary = jest.fn();
    const first = jest.fn();
    const second = jest.fn();
    emitter.onEvent = primary;

    attach(emitter, 'onEvent', first);
    attach(emitter, 'onEvent', second);
    emitter.fire(7);

    expect(primary).toHaveBeenCalledWith(7);
    expect(first).toHaveBeenCalledWith(7);
    expect(second).toHaveBeenCalledWith(7);
  });

  test('an assignment after attach replaces only the primary handler', () => {
    const emitter = new Emitter();
    const listener = jest.fn();
    const replaced = jest.fn();
    const replacement = jest.fn();
    emitter.onEvent = replaced;

    attach(emitter, 'onEvent', listener);
    emitter.onEvent = replacement;
    emitter.fire(1);

    expect(replaced).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledWith(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  test('detaching the last listener restores a plain property', () => {
    const emitter = new Emitter();
    const primary = jest.fn();
    const listener = jest.fn();
    emitter.onEvent = primary;

    const detach = attach(emitter, 'onEvent', listener);
    detach();
    detach();
    emitter.fire(3);

    expect(emitter.onEvent).toBe(primary);
    expect(listener).not.toHaveBeenCalled();
    expect(Object.getOwnPropertyDescriptor(emitter, 'onEvent')?.writable).toBe(
      true
    );
  });

  test('listeners on different slots and targets stay independent', () => {
    const a = new Emitter();
    const b = new Emitter();
    const onA = jest.fn();
    const onOther = jest.fn();

    const detachA = attach(a, 'onEvent', onA);
    attach(a, 'onOther', onOther);
    b.fire(5);
    a.onOther?.();
    detachA();
    a.fire(2);

    expect(onA).not.toHaveBeenCalled();
    expect(onOther).toHaveBeenCalledTimes(1);
  });

  test('the same function attached twice is called twice and detached separately', () => {
    const emitter = new Emitter();
    const listener = jest.fn();

    const detachFirst = attach(emitter, 'onEvent', listener);
    attach(emitter, 'onEvent', listener);
    emitter.fire(1);
    detachFirst();
    emitter.fire(2);

    expect(listener).toHaveBeenCalledTimes(3);
  });
});
