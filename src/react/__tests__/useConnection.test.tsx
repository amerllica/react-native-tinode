import { describe, expect, jest, test } from '@jest/globals';
import { act } from 'react';
import { FakeClient } from '../__fixtures__/fake-client';
import { renderHook } from '../__fixtures__/render-hook';
import { useConnection } from '../useConnection';
import { useLogin } from '../useLogin';

describe('useConnection', () => {
  test('follows the client through reconnect, connect, login and disconnect', async () => {
    const client = new FakeClient();
    const { result } = await renderHook(useConnection, client);
    expect(result.current.status).toBe('disconnected');

    await act(async () => client.onAutoreconnectIteration?.(2_000));
    expect(result.current).toEqual({ status: 'disconnected', retryIn: 2_000 });

    await act(async () =>
      client.onAutoreconnectIteration?.(0, new Promise(() => {}))
    );
    expect(result.current.status).toBe('connecting');
    expect(result.current.retryIn).toBeUndefined();

    await act(async () => {
      client.connected = true;
      client.onConnect?.();
    });
    expect(result.current.status).toBe('connected');

    await act(async () => {
      client.authenticated = true;
      client.onLogin?.(200, 'ok');
    });
    expect(result.current.status).toBe('authenticated');

    const failure = new Error('socket closed');
    await act(async () => {
      client.connected = false;
      client.authenticated = false;
      client.onDisconnect?.(failure);
    });
    expect(result.current).toEqual({
      status: 'disconnected',
      retryIn: undefined,
      error: failure,
    });
  });

  test('reports a failed reconnect attempt as an error', async () => {
    const client = new FakeClient();
    const { result } = await renderHook(useConnection, client);
    const failure = new Error('refused');

    await act(async () =>
      client.onAutoreconnectIteration?.(0, Promise.reject(failure))
    );

    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBe(failure);
  });

  test('does not replace callbacks the app installed itself', async () => {
    const client = new FakeClient();
    const appOnConnect = jest.fn();
    client.onConnect = appOnConnect;
    const { result } = await renderHook(useConnection, client);

    await act(async () => {
      client.connected = true;
      client.onConnect?.();
    });

    expect(appOnConnect).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('connected');
  });

  test('logs in again with the session token after a reconnect', async () => {
    const client = new FakeClient();
    const loginToken = jest.spyOn(client, 'loginToken');
    const { result } = await renderHook(
      () => ({ connection: useConnection(), login: useLogin() }),
      client
    );

    await act(() => result.current.login.loginBasic('alice', 'alice123'));
    expect(result.current.connection.status).toBe('authenticated');
    expect(result.current.login.user).toBe('usrMe');

    await act(async () => {
      client.disconnect();
      client.onDisconnect?.();
    });
    await act(async () => {
      client.connected = true;
      client.onConnect?.();
    });

    expect(loginToken).toHaveBeenCalledWith('token-1');
    expect(result.current.connection.status).toBe('authenticated');
  });
});
