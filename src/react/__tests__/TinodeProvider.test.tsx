import { describe, expect, test } from '@jest/globals';
import { act } from 'react';
import { mount } from '../__fixtures__/render-hook';
import { createTinode, detectPlatform } from '../createTinode';
import type { NetInfoLike, NetInfoStateLike } from '../netinfo';
import { TinodeProvider } from '../TinodeProvider';
import { useConnection, type ConnectionInfo } from '../useConnection';
import { useTinode } from '../useTinode';
import { FakeClient } from '../__fixtures__/fake-client';
import { TinodeStoresProvider } from '../TinodeStoresProvider';
import { useLogin } from '../useLogin';

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
      <TinodeProvider
        config={{ appName: 'Test/1.0', host: 'localhost:6060', apiKey: 'key' }}
        reconnectOnForeground={false}
      >
        <Probe />
      </TinodeProvider>
    );

    expect(seen.client).toBeDefined();
    expect(seen.connection?.status).toBe('disconnected');
    await act(async () => renderer.unmount());
  });

  test('accepts a client built with createTinode', async () => {
    const client = createTinode({
      appName: 'Test/1.0',
      host: 'localhost:6060',
      apiKey: 'key',
    });
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

  test('reconnects when the network comes back after a login', async () => {
    const client = new FakeClient();
    const netInfo = new FakeNetInfo();
    const session: { login?: ReturnType<typeof useLogin> } = {};

    function Probe() {
      session.login = useLogin();
      return null;
    }

    await mount(
      <TinodeStoresProvider client={client} netInfo={netInfo}>
        <Probe />
      </TinodeStoresProvider>
    );

    await act(async () => netInfo.listener?.({ isConnected: false }));
    await act(async () => netInfo.listener?.({ isConnected: true }));
    expect(client.reconnectCalls).toBe(0);

    await act(async () => session.login?.loginBasic('alice', 'alice123'));
    await act(async () => {
      client.disconnect();
      client.onDisconnect?.();
    });
    await act(async () => netInfo.listener?.({ isConnected: false }));
    await act(async () => netInfo.listener?.({ isConnected: true }));

    expect(client.reconnectCalls).toBe(1);
  });
});
