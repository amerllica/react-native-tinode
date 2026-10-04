import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { act } from 'react';
import { FakeClient } from '../__fixtures__/fake-client';
import { flush, mount, withClient } from '../__fixtures__/render-hook';
import { LEAVE_DELAY_MS } from '../topic-registry';
import { useTopic } from '../useTopic';

const TOPIC = 'grpChat';

function Viewer() {
  useTopic(TOPIC);
  return null;
}

function Screen({ viewers }: { viewers: number }) {
  return (
    <>
      {Array.from({ length: viewers }, (_, index) => (
        <Viewer key={index} />
      ))}
    </>
  );
}

describe('useTopic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('subscribes once for many components and leaves after the last one is gone', async () => {
    const client = FakeClient.authenticatedClient();
    const topic = client.getTopic(TOPIC);
    const renderer = await mount(withClient(client, <Screen viewers={2} />));
    expect(topic.subscribeCalls).toHaveLength(1);

    await act(async () =>
      renderer.update(withClient(client, <Screen viewers={1} />))
    );
    await act(async () => jest.advanceTimersByTime(LEAVE_DELAY_MS * 2));
    expect(topic.leaveCalls).toHaveLength(0);

    await act(async () =>
      renderer.update(withClient(client, <Screen viewers={0} />))
    );
    await act(async () => jest.advanceTimersByTime(LEAVE_DELAY_MS - 1));
    expect(topic.leaveCalls).toHaveLength(0);

    await act(async () => jest.advanceTimersByTime(1));
    expect(topic.leaveCalls).toEqual([false]);
    expect(topic.isSubscribed()).toBe(false);
  });

  test('a remount within the leave delay keeps the subscription', async () => {
    const client = FakeClient.authenticatedClient();
    const topic = client.getTopic(TOPIC);
    const renderer = await mount(withClient(client, <Screen viewers={1} />));

    await act(async () =>
      renderer.update(withClient(client, <Screen viewers={0} />))
    );
    await act(async () => jest.advanceTimersByTime(LEAVE_DELAY_MS / 2));
    await act(async () =>
      renderer.update(withClient(client, <Screen viewers={1} />))
    );
    await act(async () => jest.advanceTimersByTime(LEAVE_DELAY_MS * 2));

    expect(topic.subscribeCalls).toHaveLength(1);
    expect(topic.leaveCalls).toHaveLength(0);
  });

  test('waits for authentication before subscribing', async () => {
    const client = new FakeClient();
    const topic = client.getTopic(TOPIC);
    await mount(withClient(client, <Screen viewers={1} />));
    expect(topic.subscribeCalls).toHaveLength(0);

    await act(async () => {
      client.connected = true;
      client.authenticated = true;
      client.onLogin?.(200, 'ok');
    });
    await flush();

    expect(topic.subscribeCalls).toHaveLength(1);
  });
});
