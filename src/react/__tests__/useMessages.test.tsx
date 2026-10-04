import { describe, expect, test } from '@jest/globals';
import { act } from 'react';
import { LOCAL_SEQID } from '../../core/config';
import { FakeClient, makeHistory } from '../__fixtures__/fake-client';
import { renderHook } from '../__fixtures__/render-hook';
import { useMessages } from '../useMessages';

const TOPIC = 'grpChat';
const PAGE = 24;

async function setup(historySize: number) {
  const client = FakeClient.authenticatedClient();
  const topic = client.getTopic(TOPIC);
  topic.history = makeHistory(TOPIC, historySize);
  const hook = await renderHook(
    () => useMessages(TOPIC, { pageSize: PAGE }),
    client
  );
  return { client, topic, ...hook };
}

describe('useMessages', () => {
  test('loads older pages until the history is exhausted', async () => {
    const { topic, result } = await setup(50);
    expect(result.current.messages.map((msg) => msg.seq)).toEqual(
      Array.from({ length: PAGE }, (_, index) => 27 + index)
    );
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(topic.pageRequests).toEqual([{ limit: PAGE, max: 27 }]);
    expect(result.current.messages).toHaveLength(48);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(result.current.messages[0]?.seq).toBe(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);

    await act(() => result.current.loadMore());
    expect(topic.pageRequests).toHaveLength(2);
  });

  test('a short history has nothing more to load', async () => {
    const { topic, result } = await setup(5);

    expect(result.current.messages).toHaveLength(5);
    expect(result.current.hasMore).toBe(false);
    await act(() => result.current.loadMore());
    expect(topic.pageRequests).toHaveLength(0);
  });

  test('sends a draft, reports its status and marks messages as read', async () => {
    const { topic, result } = await setup(3);

    await act(() => result.current.send('hello'));
    const sent = result.current.messages[result.current.messages.length - 1];

    expect(topic.published.map((pub) => pub.content)).toEqual(['hello']);
    expect(sent?.content).toBe('hello');
    expect(sent && result.current.status(sent)).toBe(50);

    result.current.markRead(3);
    expect(topic.readNotes).toEqual([3]);
  });

  test('does not send a read note for a message that is still pending', async () => {
    const { topic, result } = await setup(3);

    result.current.markRead(LOCAL_SEQID);
    result.current.markRead(0);
    expect(topic.readNotes).toEqual([]);
  });
});
