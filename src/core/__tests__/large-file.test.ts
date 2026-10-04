import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import LargeFileHelper, { addURLParam } from '../large-file';
import type {
  LargeFileTinode,
  ReactNativeFileDescriptor,
  UploadProgressEventLike,
  XHRLike,
} from '../large-file';

const REQUEST_DONE = 4;
const OriginalFormData: unknown = Reflect.get(globalThis, 'FormData');

class FakeXHR implements XHRLike {
  static instances: FakeXHR[] = [];

  readyState = 0;
  status = 0;
  statusText = '';
  response: unknown = null;
  responseType = '';
  upload: { onprogress: ((evt: UploadProgressEventLike) => void) | null } = {
    onprogress: null,
  };
  onload: ((evt: unknown) => void) | null = null;
  onerror: ((evt: unknown) => void) | null = null;
  onabort: ((evt: unknown) => void) | null = null;
  onprogress: ((evt: { loaded: number }) => void) | null = null;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null | undefined = undefined;
  aborted = false;

  constructor() {
    FakeXHR.instances.push(this);
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body?: FormData | null): void {
    this.body = body;
  }

  abort(): void {
    this.aborted = true;
    this.onabort?.({});
  }

  complete(status: number, response: unknown, statusText = ''): void {
    this.readyState = REQUEST_DONE;
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.onload?.({});
  }

  static latest(): FakeXHR {
    const request = FakeXHR.instances[FakeXHR.instances.length - 1];
    if (!request) {
      throw new Error('No request was created');
    }
    return request;
  }
}

class RecordingFormData {
  static instances: RecordingFormData[] = [];

  readonly entries: [string, unknown][] = [];

  constructor() {
    RecordingFormData.instances.push(this);
  }

  append(name: string, value: unknown): void {
    this.entries.push([name, value]);
  }
}

function recordedEntries(): Map<string, unknown> {
  const form = RecordingFormData.instances[0];
  if (!form) {
    throw new Error('No form was built');
  }
  return new Map(form.entries);
}

function makeTinode(overrides: Partial<LargeFileTinode> = {}): LargeFileTinode {
  return {
    _apiKey: 'KEY',
    _secure: true,
    _host: 'api.example.com',
    getAuthToken: () => ({ token: 'TOKEN', expires: new Date(0) }),
    getNextUniqueId: () => '101',
    logger: jest.fn(),
    ...overrides,
  };
}

describe('addURLParam', () => {
  test('appends to a relative url without query', () => {
    expect(addURLParam('/v0/file/s/abc.jpg', 'asatt', '1')).toBe(
      '/v0/file/s/abc.jpg?asatt=1'
    );
  });

  test('appends to a relative url with a query', () => {
    expect(addURLParam('/v0/file/s/abc.jpg?x=y', 'asatt', '1')).toBe(
      '/v0/file/s/abc.jpg?x=y&asatt=1'
    );
  });

  test('keeps the hash at the end', () => {
    expect(addURLParam('/file#frag', 'asatt', '1')).toBe('/file?asatt=1#frag');
  });

  test('handles absolute urls', () => {
    expect(addURLParam('https://host.example/a/b?c=d', 'k', 'v w')).toBe(
      'https://host.example/a/b?c=d&k=v%20w'
    );
  });
});

describe('LargeFileHelper', () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    LargeFileHelper.setNetworkProvider(FakeXHR);
    RecordingFormData.instances = [];
    Object.defineProperty(globalThis, 'FormData', {
      value: RecordingFormData,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'FormData', {
      value: OriginalFormData,
      configurable: true,
      writable: true,
    });
    LargeFileHelper.setNetworkProvider(undefined);
    jest.restoreAllMocks();
  });

  describe('upload', () => {
    const descriptor: ReactNativeFileDescriptor = {
      uri: 'file:///tmp/photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    };

    test('posts a react native file descriptor as is, with id and topic', async () => {
      const helper = new LargeFileHelper(makeTinode(), '0');

      const uploading = helper.upload(descriptor, 'usrABC');
      const xhr = FakeXHR.latest();
      xhr.complete(
        200,
        JSON.stringify({
          ctrl: { code: 200, text: 'ok', params: { url: '/v0/file/s/x.jpg' } },
        })
      );

      await expect(uploading).resolves.toBe('/v0/file/s/x.jpg');
      expect(xhr.method).toBe('POST');
      expect(xhr.url).toBe('https://api.example.com/v0/file/u/');
      expect(xhr.headers).toEqual({
        'X-Tinode-APIKey': 'KEY',
        'X-Tinode-Auth': 'Token TOKEN',
      });

      const entries = recordedEntries();
      expect(xhr.body).toBeInstanceOf(RecordingFormData);
      expect(entries.get('file')).toBe(descriptor);
      expect(entries.get('id')).toBe('101');
      expect(entries.get('topic')).toBe('usrABC');
    });

    test('rejects with CommError and calls onFailure on server error', async () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const onFailure = jest.fn();
      const onSuccess = jest.fn();

      const uploading = helper.upload(
        descriptor,
        null,
        null,
        onSuccess,
        onFailure
      );
      FakeXHR.latest().complete(
        413,
        JSON.stringify({ ctrl: { code: 413, text: 'too large' } })
      );

      await expect(uploading).rejects.toMatchObject({ code: 413 });
      expect(onFailure).toHaveBeenCalledWith(
        expect.objectContaining({ code: 413, text: 'too large' })
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('falls back to status when the response is not json', async () => {
      const logger = jest.fn();
      const helper = new LargeFileHelper(makeTinode({ logger }), '0');

      const uploading = helper.upload(descriptor);
      FakeXHR.latest().complete(500, '<html>', 'Server Error');

      await expect(uploading).rejects.toMatchObject({ code: 500 });
      expect(logger).toHaveBeenCalled();
    });

    test('reports progress to both callbacks', () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const onProgress = jest.fn();
      const helperProgress = jest.fn();
      helper.onProgress = helperProgress;

      helper.upload(descriptor, null, onProgress).catch(() => {});
      FakeXHR.latest().upload.onprogress?.({
        lengthComputable: true,
        loaded: 1,
        total: 4,
      });

      expect(onProgress).toHaveBeenCalledWith(0.25);
      expect(helperProgress).toHaveBeenCalledWith(0.25);
    });

    test('rejects a base url that is not http(s)', () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      expect(() => helper.uploadWithBaseUrl('ftp://x', descriptor)).toThrow(
        "Invalid base URL 'ftp://x'"
      );
    });

    test('cancel aborts pending requests', async () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const uploading = helper.upload(descriptor);

      helper.cancel();

      await expect(uploading).rejects.toThrow('upload cancelled by user');
      expect(FakeXHR.latest().aborted).toBe(true);
    });
  });

  describe('download', () => {
    test('refuses absolute urls', () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const onError = jest.fn();

      const result = helper.download(
        'https://evil.example/f',
        'f',
        'x/y',
        null,
        onError
      );

      expect(result).toBeUndefined();
      expect(onError).toHaveBeenCalled();
      expect(FakeXHR.instances).toHaveLength(0);
    });

    test('refuses when not authenticated', () => {
      const helper = new LargeFileHelper(
        makeTinode({ getAuthToken: () => null }),
        '0'
      );
      const onError = jest.fn();

      expect(
        helper.download('/v0/file/s/a', 'a', 'x/y', null, onError)
      ).toBeUndefined();
      expect(onError).toHaveBeenCalledWith('Must authenticate first');
    });

    test('resolves with the downloaded Blob when there is no document', async () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const blob = new Blob(['content'], {
        type: 'text/plain',
        lastModified: 0,
      });

      const downloading = helper.download(
        '/v0/file/s/a.txt',
        'a.txt',
        'text/plain'
      );
      const xhr = FakeXHR.latest();
      xhr.complete(200, blob);

      await expect(downloading).resolves.toBe(blob);
      expect(xhr.method).toBe('GET');
      expect(xhr.url).toBe('/v0/file/s/a.txt?asatt=1');
      expect(xhr.responseType).toBe('blob');
      expect(xhr.headers['X-Tinode-Auth']).toBe('Token TOKEN');
    });

    test('reports progress as loaded bytes', () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const onProgress = jest.fn();

      helper.download('/v0/file/s/a', 'a', 'x/y', onProgress)?.catch(() => {});
      FakeXHR.latest().onprogress?.({ loaded: 512 });

      expect(onProgress).toHaveBeenCalledWith(512);
    });

    test('rejects on network error', async () => {
      const helper = new LargeFileHelper(makeTinode(), '0');
      const onError = jest.fn();

      const downloading = helper.download(
        '/v0/file/s/a',
        'a',
        'x/y',
        null,
        onError
      );
      FakeXHR.latest().onerror?.({});

      await expect(downloading).rejects.toThrow('failed');
      expect(onError).toHaveBeenCalled();
    });
  });
});
