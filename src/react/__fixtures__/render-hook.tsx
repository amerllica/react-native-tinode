import { act, type ReactElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { TinodeStoresProvider } from '../TinodeStoresProvider';
import type { ClientPort } from '../ports';

export interface HookResult<R> {
  readonly current: R;
}

export interface RenderedHook<R> {
  result: HookResult<R>;
  unmount: () => Promise<void>;
}

export function withClient(client: ClientPort, children: ReactElement) {
  return (
    <TinodeStoresProvider
      client={client}
      reconnectOnForeground={false}
      netInfo={null}
    >
      {children}
    </TinodeStoresProvider>
  );
}

export function mount(element: ReactElement): Promise<ReactTestRenderer> {
  return act(async () => create(element));
}

export async function renderHook<R>(
  useHook: () => R,
  client: ClientPort
): Promise<RenderedHook<R>> {
  const box: { latest?: { value: R } } = {};

  function Probe() {
    box.latest = { value: useHook() };
    return null;
  }

  const renderer = await mount(withClient(client, <Probe />));

  return {
    result: {
      get current(): R {
        if (!box.latest) {
          throw new Error('Hook has not rendered yet');
        }
        return box.latest.value;
      },
    },
    unmount: () => act(async () => renderer.unmount()),
  };
}

export function flush(): Promise<void> {
  return act(async () => {});
}
