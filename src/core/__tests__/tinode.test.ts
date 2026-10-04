import { afterAll, describe, expect, jest, test } from '@jest/globals';
import * as Const from '../config';
import { Tinode } from '../tinode';

describe('Tinode static methods', () => {
  describe('credential', () => {
    test('builds a credential from separate arguments', () => {
      const cred = Tinode.credential(
        'email',
        'user@example.com',
        { key: 'value' },
        'response'
      );
      expect(cred).toHaveLength(1);
      expect(cred?.[0]?.meth).toBe('email');
      expect(cred?.[0]?.val).toBe('user@example.com');
      expect(cred?.[0]?.params).toEqual({ key: 'value' });
      expect(cred?.[0]?.resp).toBe('response');
    });

    test('builds a credential from an object', () => {
      const cred = Tinode.credential({
        meth: 'phone',
        val: '+1234567890',
        params: { code: '123' },
        resp: 'verified',
      });
      expect(cred).toHaveLength(1);
      expect(cred?.[0]?.meth).toBe('phone');
      expect(cred?.[0]?.val).toBe('+1234567890');
    });

    test('needs a value or a response besides the method', () => {
      expect(Tinode.credential('email')).toBeNull();
    });

    test('needs a method', () => {
      expect(Tinode.credential(undefined, 'value')).toBeNull();
    });

    test('accepts a method with a value', () => {
      expect(Tinode.credential('email', 'test@example.com')).toHaveLength(1);
    });

    test('accepts a method with only a response', () => {
      const cred = Tinode.credential('email', null, null, 'response_value');
      expect(cred).toHaveLength(1);
      expect(cred?.[0]?.resp).toBe('response_value');
    });
  });

  describe('topicType', () => {
    test.each([
      ['me', 'me'],
      ['fnd', 'fnd'],
      ['sys', 'sys'],
      ['grptest', 'grp'],
      ['usr123', 'p2p'],
      ['slf', 'slf'],
    ])('%s is %s', (name, type) => {
      expect(Tinode.topicType(name)).toBe(type);
    });

    test('unknown prefix gives undefined', () => {
      expect(Tinode.topicType('invalid-topic')).toBeUndefined();
    });
  });

  describe('isMeTopicName', () => {
    test('matches me', () => {
      expect(Tinode.isMeTopicName('me')).toBe(true);
    });

    test('rejects other topics', () => {
      expect(Tinode.isMeTopicName('grptest')).toBe(false);
      expect(Tinode.isMeTopicName('usr123')).toBe(false);
      expect(Tinode.isMeTopicName('fnd')).toBe(false);
    });

    test('rejects null and undefined', () => {
      expect(Tinode.isMeTopicName(null)).toBe(false);
      expect(Tinode.isMeTopicName(undefined)).toBe(false);
    });
  });

  describe('isSelfTopicName', () => {
    test('matches slf', () => {
      expect(Tinode.isSelfTopicName('slf')).toBe(true);
    });

    test('rejects other topics', () => {
      expect(Tinode.isSelfTopicName('grptest')).toBe(false);
      expect(Tinode.isSelfTopicName('usr123')).toBe(false);
    });
  });

  describe('isGroupTopicName', () => {
    test('matches grp names', () => {
      expect(Tinode.isGroupTopicName('grptest')).toBe(true);
      expect(Tinode.isGroupTopicName('grpabcdef')).toBe(true);
    });

    test('rejects other topics', () => {
      expect(Tinode.isGroupTopicName('me')).toBe(false);
      expect(Tinode.isGroupTopicName('usr123')).toBe(false);
      expect(Tinode.isGroupTopicName('fnd')).toBe(false);
    });
  });

  describe('isP2PTopicName', () => {
    test('matches usr names', () => {
      expect(Tinode.isP2PTopicName('usr123')).toBe(true);
      expect(Tinode.isP2PTopicName('usrABC')).toBe(true);
    });

    test('rejects other topics', () => {
      expect(Tinode.isP2PTopicName('me')).toBe(false);
      expect(Tinode.isP2PTopicName('grptest')).toBe(false);
      expect(Tinode.isP2PTopicName('fnd')).toBe(false);
    });
  });

  describe('isCommTopicName', () => {
    test('matches p2p, slf and group topics', () => {
      expect(Tinode.isCommTopicName('usr123')).toBe(true);
      expect(Tinode.isCommTopicName('grptest')).toBe(true);
      expect(Tinode.isCommTopicName('slf')).toBe(true);
    });

    test('rejects me, fnd and sys', () => {
      expect(Tinode.isCommTopicName('me')).toBe(false);
      expect(Tinode.isCommTopicName('fnd')).toBe(false);
      expect(Tinode.isCommTopicName('sys')).toBe(false);
    });
  });

  describe('isNewGroupTopicName', () => {
    test('matches new and nch prefixes', () => {
      expect(Tinode.isNewGroupTopicName('new123')).toBe(true);
      expect(Tinode.isNewGroupTopicName('nch123')).toBe(true);
    });

    test('rejects existing topics', () => {
      expect(Tinode.isNewGroupTopicName('grptest')).toBe(false);
      expect(Tinode.isNewGroupTopicName('usr123')).toBe(false);
      expect(Tinode.isNewGroupTopicName('chn123')).toBe(false);
    });
  });

  describe('isChannelTopicName', () => {
    test('matches chn and nch prefixes', () => {
      expect(Tinode.isChannelTopicName('chn123')).toBe(true);
      expect(Tinode.isChannelTopicName('nch123')).toBe(true);
    });

    test('rejects non-channels', () => {
      expect(Tinode.isChannelTopicName('grptest')).toBe(false);
      expect(Tinode.isChannelTopicName('usr123')).toBe(false);
    });
  });

  describe('getVersion', () => {
    test('returns a non-empty string', () => {
      const version = Tinode.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('setNetworkProviders', () => {
    afterAll(() => {
      Tinode.setNetworkProviders(
        globalThis.WebSocket,
        globalThis.XMLHttpRequest
      );
    });

    test('accepts the platform WebSocket and XMLHttpRequest', () => {
      expect(() => {
        Tinode.setNetworkProviders(
          globalThis.WebSocket,
          globalThis.XMLHttpRequest
        );
      }).not.toThrow();
    });

    test('accepts null providers', () => {
      expect(() => {
        Tinode.setNetworkProviders(null, null);
      }).not.toThrow();
    });
  });

  describe('getLibrary', () => {
    test('returns a non-empty string', () => {
      const lib = Tinode.getLibrary();
      expect(typeof lib).toBe('string');
      expect(lib.length).toBeGreaterThan(0);
    });
  });

  describe('isNullValue', () => {
    test('is true only for DEL_CHAR', () => {
      expect(Tinode.isNullValue(Const.DEL_CHAR)).toBe(true);
      expect(Tinode.isNullValue('test')).toBe(false);
      expect(Tinode.isNullValue('value')).toBe(false);
      expect(Tinode.isNullValue('')).toBe(false);
      expect(Tinode.isNullValue(null)).toBe(false);
      expect(Tinode.isNullValue(undefined)).toBe(false);
    });
  });

  describe('isServerAssignedSeq', () => {
    test('accepts ids below LOCAL_SEQID', () => {
      expect(Tinode.isServerAssignedSeq(1)).toBe(true);
      expect(Tinode.isServerAssignedSeq(100)).toBe(true);
      expect(Tinode.isServerAssignedSeq(Const.LOCAL_SEQID - 1)).toBe(true);
    });

    test('rejects local ids', () => {
      expect(Tinode.isServerAssignedSeq(Const.LOCAL_SEQID)).toBe(false);
      expect(Tinode.isServerAssignedSeq(Const.LOCAL_SEQID + 1)).toBe(false);
    });

    test('rejects zero and negative ids', () => {
      expect(Tinode.isServerAssignedSeq(0)).toBe(false);
      expect(Tinode.isServerAssignedSeq(-1)).toBe(false);
    });
  });

  describe('parseTinodeUrl', () => {
    test('extracts the id from tinode:///id/ URLs', () => {
      expect(Tinode.parseTinodeUrl('tinode:///id/usr123')).toBe('usr123');
      expect(Tinode.parseTinodeUrl('tinode:///id/usrABCDEF')).toBe('usrABCDEF');
    });

    test('returns other strings unchanged', () => {
      expect(Tinode.parseTinodeUrl('user@example.com')).toBe(
        'user@example.com'
      );
      expect(Tinode.parseTinodeUrl('tinode:///invalid')).toBe(
        'tinode:///invalid'
      );
    });

    test('returns null for non-strings', () => {
      expect(Tinode.parseTinodeUrl(null)).toBeNull();
      expect(Tinode.parseTinodeUrl(undefined)).toBeNull();
      expect(Tinode.parseTinodeUrl(123)).toBeNull();
      expect(Tinode.parseTinodeUrl({})).toBeNull();
    });
  });

  describe('isValidTagValue', () => {
    test('accepts 4 to 23 letters, digits, hyphens and underscores', () => {
      expect(Tinode.isValidTagValue('test')).toBe(true);
      expect(Tinode.isValidTagValue('tag123')).toBe(true);
      expect(Tinode.isValidTagValue('a_tag')).toBe(true);
      expect(Tinode.isValidTagValue('tag-name')).toBe(true);
    });

    test('rejects tags under 4 characters', () => {
      expect(Tinode.isValidTagValue('tag')).toBe(false);
      expect(Tinode.isValidTagValue('ab')).toBe(false);
    });

    test('rejects tags over 24 characters', () => {
      expect(Tinode.isValidTagValue('a'.repeat(25))).toBe(false);
    });

    test('rejects a leading underscore or hyphen', () => {
      expect(Tinode.isValidTagValue('_tag')).toBe(false);
      expect(Tinode.isValidTagValue('-tag')).toBe(false);
    });

    test('rejects empty and non-string values', () => {
      expect(Tinode.isValidTagValue('')).toBe(false);
      expect(Tinode.isValidTagValue(null)).toBe(false);
      expect(Tinode.isValidTagValue(undefined)).toBe(false);
      expect(Tinode.isValidTagValue(123)).toBe(false);
      expect(Tinode.isValidTagValue({})).toBe(false);
    });
  });

  describe('tagSplit', () => {
    test('splits prefix and value at the first colon', () => {
      expect(Tinode.tagSplit('email:user@example.com')).toEqual({
        prefix: 'email',
        value: 'user@example.com',
      });
      expect(Tinode.tagSplit('type:value:extra')).toEqual({
        prefix: 'type',
        value: 'value:extra',
      });
    });

    test('trims whitespace', () => {
      expect(Tinode.tagSplit('  email:test@example.com  ')).toEqual({
        prefix: 'email',
        value: 'test@example.com',
      });
    });

    test('returns null for malformed tags', () => {
      expect(Tinode.tagSplit('notag')).toBeNull();
      expect(Tinode.tagSplit(':')).toBeNull();
      expect(Tinode.tagSplit(':value')).toBeNull();
      expect(Tinode.tagSplit('')).toBeNull();
      expect(Tinode.tagSplit('   ')).toBeNull();
      expect(Tinode.tagSplit(null)).toBeNull();
      expect(Tinode.tagSplit(undefined)).toBeNull();
    });
  });

  describe('setUniqueTag', () => {
    test('adds the tag to an empty or missing list', () => {
      expect(Tinode.setUniqueTag([], 'email:test@example.com')).toContain(
        'email:test@example.com'
      );
      expect(Tinode.setUniqueTag(null, 'email:test@example.com')).toContain(
        'email:test@example.com'
      );
    });

    test('replaces a tag with the same prefix', () => {
      const tags = ['email:old@example.com', 'phone:123456'];
      const result = Tinode.setUniqueTag(tags, 'email:new@example.com');
      expect(result).toContain('email:new@example.com');
      expect(result).toContain('phone:123456');
      expect(result).not.toContain('email:old@example.com');
      expect(result).toHaveLength(2);
    });

    test('keeps tags with other prefixes', () => {
      const result = Tinode.setUniqueTag(
        ['phone:123456'],
        'email:test@example.com'
      );
      expect(result).toEqual(['phone:123456', 'email:test@example.com']);
    });

    test('ignores a tag without a prefix', () => {
      const tags = ['phone:123456'];
      expect(Tinode.setUniqueTag(tags, 'invalid-tag')).toEqual(tags);
    });
  });

  describe('clearTagPrefix', () => {
    test('removes every tag with the prefix', () => {
      const tags = [
        'email:test@example.com',
        'phone:123456',
        'email:another@example.com',
      ];
      expect(Tinode.clearTagPrefix(tags, 'email')).toEqual(['phone:123456']);
    });

    test('can remove everything', () => {
      const tags = ['email:test@example.com', 'email:another@example.com'];
      expect(Tinode.clearTagPrefix(tags, 'email')).toHaveLength(0);
    });

    test('keeps the list when nothing matches', () => {
      const tags = ['phone:123456', 'alias:username'];
      expect(Tinode.clearTagPrefix(tags, 'email')).toEqual(tags);
    });

    test('returns an empty list for null or empty input', () => {
      expect(Tinode.clearTagPrefix(null, 'email')).toEqual([]);
      expect(Tinode.clearTagPrefix([], 'email')).toEqual([]);
    });

    test('drops null and empty entries', () => {
      const tags = ['email:test@example.com', null, '', 'phone:123456'];
      expect(Tinode.clearTagPrefix(tags, 'email')).toEqual(['phone:123456']);
    });
  });

  describe('tagByPrefix', () => {
    test('returns the first tag with the prefix', () => {
      const tags = [
        'email:test@example.com',
        'phone:123456',
        'email:another@example.com',
      ];
      expect(Tinode.tagByPrefix(tags, 'email')).toBe('email:test@example.com');
    });

    test('returns undefined when nothing matches', () => {
      expect(
        Tinode.tagByPrefix(['phone:123456', 'alias:username'], 'email')
      ).toBeUndefined();
      expect(Tinode.tagByPrefix(null, 'email')).toBeUndefined();
      expect(Tinode.tagByPrefix([], 'email')).toBeUndefined();
    });

    test('skips null and empty entries', () => {
      expect(
        Tinode.tagByPrefix(
          [null, '', 'email:test@example.com', 'phone:123456'],
          'email'
        )
      ).toBe('email:test@example.com');
      expect(
        Tinode.tagByPrefix([null, null, 'email:test@example.com'], 'email')
      ).toBe('email:test@example.com');
    });
  });
});

describe('Tinode requests', () => {
  function connectedTinode() {
    const tinode = new Tinode({ host: 'localhost:6060', apiKey: 'test-key' });
    const sent: string[] = [];
    tinode._connection.sendText = (msg) => {
      sent.push(msg);
    };
    const reply = (pkt: object) => {
      tinode._connection.onMessage?.(JSON.stringify(pkt));
    };
    const lastPacket = (): Record<string, Record<string, unknown>> =>
      JSON.parse(sent[sent.length - 1] ?? 'null');
    return { tinode, reply, lastPacket };
  }

  test('loginBasic sends unicode credentials as base64', async () => {
    const { tinode, reply, lastPacket } = connectedTinode();
    const done = tinode.loginBasic('alice', 'пароль');
    const login = lastPacket().login;
    expect(login?.secret).toBe(
      Buffer.from('alice:пароль', 'utf8').toString('base64')
    );

    reply({
      ctrl: {
        id: login?.id,
        code: 200,
        text: 'ok',
        ts: '2026-01-01T00:00:00.000Z',
        params: { user: 'usrAlice' },
      },
    });
    await done;
    expect(tinode.getCurrentUserID()).toBe('usrAlice');
    expect(tinode.getCurrentLogin()).toBe('alice');
  });

  test('getMeta resolves with the {meta} reply', async () => {
    const { tinode, reply, lastPacket } = connectedTinode();
    const done = tinode.getMeta('grpTest', { what: 'tags' });
    const get = lastPacket().get;
    expect(get?.topic).toBe('grpTest');

    reply({ meta: { id: get?.id, topic: 'grpTest', tags: ['alias:test'] } });
    await expect(done).resolves.toEqual({
      id: get?.id,
      topic: 'grpTest',
      tags: ['alias:test'],
    });
  });

  test('a failed {ctrl} rejects the request with its code', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { tinode, reply, lastPacket } = connectedTinode();
    const done = tinode.leave('grpTest');
    reply({
      ctrl: {
        id: lastPacket().leave?.id,
        code: 404,
        text: 'not found',
        ts: '2026-01-01T00:00:00.000Z',
      },
    });
    await expect(done).rejects.toMatchObject({ code: 404 });
  });
});
