import { describe, expect, jest, test } from '@jest/globals';
import { act } from 'react';
import type { NetInfoLike, NetInfoStateLike } from '../../sdk';
import { mount } from '../__fixtures__/render-hook';
import { createTinode, detectPlatform } from '../createTinode';
import { TinodeProvider } from '../TinodeProvider';
import { useConnection, type ConnectionInfo } from '../useConnection';
import { useTinode } from '../useTinode';

class FakeWebSocket {
  readyState = 0;
  onopen = null;
  onclose = null;
  onerror = null;
  onmessage = null;
  close(): void {}
  send(): void {}
}

const config = {
  appName: 'Test/1.0',
  host: 'localhost:6060',
  apiKey: 'key',
  network: { WebSocket: FakeWebSocket },
};

class FakeNetInfo implements NetInfoLike {
  listener: ((state: NetInfoStateLike) => void) | null = null;

  addEventListener(listener: (state: NetInfoStateLike) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

describe('TinodeProvider', () => {
  test('maps every non-mobile OS to web', () => {
    expect(detectPlatform('ios')).toBe('ios');
    expect(detectPlatform('android')).toBe('android');
    expect(detectPlatform('windows')).toBe('web');
  });

  test('provides a real client created from config', async () => {
    const seen: { client?: unknown; connection?: ConnectionInfo } = {};

    function Probe() {
      seen.client = useTinode();
      seen.connection = useConnection();
      return null;
    }

    const renderer = await mount(
      <TinodeProvider config={config} reconnectOnForeground={false}>
        <Probe />
      </TinodeProvider>
    );

    expect(seen.client).toBeDefined();
    expect(seen.connection?.status).toBe('disconnected');
    await act(async () => renderer.unmount());
  });

  test('accepts a client built with createTinode', async () => {
    const client = createTinode(config);
    const seen: { client?: unknown } = {};

    function Probe() {
      seen.client = useTinode();
      return null;
    }

    const renderer = await mount(
      <TinodeProvider client={client} reconnectOnForeground={false}>
        <Probe />
      </TinodeProvider>
    );

    expect(seen.client).toBe(client);
    await act(async () => renderer.unmount());
  });

  test('passes netInfo to the client, which retries when the network is back', () => {
    const netInfo = new FakeNetInfo();
    const client = createTinode({ ...config, netInfo });
    const retryNow = jest
      .spyOn(client._connection, 'retryNow')
      .mockImplementation(() => {});

    netInfo.listener?.({ isConnected: true });
    expect(retryNow).not.toHaveBeenCalled();

    netInfo.listener?.({ isConnected: false });
    netInfo.listener?.({ isConnected: true });
    expect(retryNow).toHaveBeenCalledTimes(1);
  });
});
