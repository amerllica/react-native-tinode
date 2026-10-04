import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { act } from 'react';
import { FakeClient, MY_UID } from '../__fixtures__/fake-client';
import { renderHook } from '../__fixtures__/render-hook';
import { KEYPRESS_THROTTLE_MS, TYPING_EXPIRY_MS } from '../typing-store';
import { useTyping } from '../useTyping';

const TOPIC = 'grpChat';

async function setup() {
  const client = FakeClient.authenticatedClient();
  const topic = client.getTopic(TOPIC);
  const hook = await renderHook(() => useTyping(TOPIC), client);
  return { topic, ...hook };
}

describe('useTyping', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows other users while they type and drops them after the expiry', async () => {
    const { topic, result } = await setup();

    await act(async () => {
      topic.onInfo?.({ what: 'kp', from: 'usrBob' });
      topic.onInfo?.({ what: 'kp', from: MY_UID });
      topic.onInfo?.({ what: 'read', from: 'usrEve', seq: 4 });
    });
    expect(result.current.typingUsers).toEqual(['usrBob']);

    await act(async () => jest.advanceTimersByTime(TYPING_EXPIRY_MS / 2));
    await act(async () => topic.onInfo?.({ what: 'kp', from: 'usrEve' }));
    await act(async () => jest.advanceTimersByTime(TYPING_EXPIRY_MS / 2));
    expect(result.current.typingUsers).toEqual(['usrEve']);

    await act(async () => jest.advanceTimersByTime(TYPING_EXPIRY_MS / 2));
    expect(result.current.typingUsers).toEqual([]);
  });

  test('a message from the typing user clears the indicator', async () => {
    const { topic, result } = await setup();

    await act(async () => topic.onInfo?.({ what: 'kp', from: 'usrBob' }));
    await act(async () =>
      topic.onData?.({ topic: TOPIC, seq: 1, from: 'usrBob', content: 'hi' })
    );

    expect(result.current.typingUsers).toEqual([]);
  });

  test('throttles outgoing key press notifications', async () => {
    const { topic, result } = await setup();

    result.current.notifyTyping();
    result.current.notifyTyping();
    jest.advanceTimersByTime(KEYPRESS_THROTTLE_MS - 1);
    result.current.notifyTyping();
    expect(topic.keyPresses).toBe(1);

    jest.advanceTimersByTime(1);
    result.current.notifyTyping();
    expect(topic.keyPresses).toBe(2);
  });
});
