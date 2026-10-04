import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Tinode } from '../tinode';
import type Topic from '../topic';

describe('Topic subscription persistence', () => {
  let tinode: Tinode;
  let topic: Topic;

  beforeEach(() => {
    tinode = new Tinode({ host: 'localhost:6060', apiKey: 'test-key' });
    const found = tinode.getTopic('grpTest');
    if (!found) {
      throw new Error('Topic was not created');
    }
    topic = found;
    jest.spyOn(tinode._db, 'updSubscription');
    jest.spyOn(tinode._db, 'remSubscription');
  });

  test('persists a received subscriber update', () => {
    const sub = {
      user: 'usrAlice',
      updated: new Date('2026-01-01T00:00:00Z'),
      read: 7,
    };

    topic._processMetaSubs([sub]);

    expect(tinode._db.updSubscription).toHaveBeenCalledWith(
      'grpTest',
      'usrAlice',
      sub
    );
    expect(tinode._db.remSubscription).not.toHaveBeenCalled();
  });

  test('removes a deleted subscriber from persistent cache', () => {
    topic._processMetaSubs([
      {
        user: 'usrAlice',
        updated: new Date('2026-01-01T00:00:00Z'),
        deleted: new Date('2026-01-02T00:00:00Z'),
      },
    ]);

    expect(tinode._db.remSubscription).toHaveBeenCalledWith(
      'grpTest',
      'usrAlice'
    );
    expect(tinode._db.updSubscription).not.toHaveBeenCalled();
  });
});
