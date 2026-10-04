import CommError from './comm-error';
import { isUrlRelative, jsonParseHelper } from './utils';
import type { Tinode } from './tinode';

type Handler<E> = { bivarianceHack(evt: E): void }['bivarianceHack'];

export interface UploadProgressEventLike {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

export interface XHRLike {
  readyState: number;
  status: number;
  statusText: string;
  response: unknown;
  responseType: string;
  upload: { onprogress: Handler<UploadProgressEventLike> | null };
  onload: Handler<unknown> | null;
  onerror: Handler<unknown> | null;
  onabort: Handler<unknown> | null;
  onprogress: Handler<{ loaded: number }> | null;
  open(method: string, url: string, async: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: FormData | null): void;
  abort(): void;
}

export type XHRProviderType = new () => XHRLike;

export type LargeFileTinode = Pick<
  Tinode,
  | '_apiKey'
  | '_secure'
  | '_host'
  | 'getAuthToken'
  | 'getNextUniqueId'
  | 'logger'
>;

export interface ReactNativeFileDescriptor {
  uri: string;
  name: string;
  type: string;
}

export type UploadData = Blob | ReactNativeFileDescriptor;

export interface ServerCtrl {
  code: number;
  text: string;
  params?: Record<string, unknown>;
}

export type ProgressCallback = (progress: number) => void;
export type SuccessCallback = (ctrl: ServerCtrl) => void;
export type FailureCallback = (ctrl: ServerCtrl | null) => void;
export type DownloadErrorCallback = (err: unknown) => void;

interface BrowserAnchor {
  href: string;
  style: { display: string };
  setAttribute(name: string, value: string): void;
  click(): void;
}

interface BrowserDocument {
  createElement(tag: 'a'): BrowserAnchor;
  body: {
    appendChild(node: BrowserAnchor): void;
    removeChild(node: BrowserAnchor): void;
  };
}

interface ObjectUrlFactory {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

let XHRProvider: XHRProviderType | undefined;

function resolveXHRProvider(): XHRProviderType {
  const provider = XHRProvider ?? globalThis.XMLHttpRequest;
  if (!provider) {
    throw new Error(
      "XMLHttpRequest is not available. Call 'LargeFileHelper.setNetworkProvider()'."
    );
  }
  return provider;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBrowserDocument(value: unknown): value is BrowserDocument {
  return (
    isObject(value) &&
    typeof value.createElement === 'function' &&
    isObject(value.body)
  );
}

function isObjectUrlFactory(value: unknown): value is ObjectUrlFactory {
  return (
    (typeof value === 'function' || isObject(value)) &&
    typeof Reflect.get(value, 'createObjectURL') === 'function' &&
    typeof Reflect.get(value, 'revokeObjectURL') === 'function'
  );
}

function getBrowserDocument(): BrowserDocument | null {
  const candidate: unknown = Reflect.get(globalThis, 'document');
  return isBrowserDocument(candidate) ? candidate : null;
}

function getObjectUrlFactory(): ObjectUrlFactory | null {
  const candidate: unknown = Reflect.get(globalThis, 'URL');
  return isObjectUrlFactory(candidate) ? candidate : null;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function parseCtrl(
  response: unknown,
  status: number,
  statusText: string,
  onInvalid: () => void
): ServerCtrl {
  try {
    if (typeof response === 'string') {
      const packet: unknown = JSON.parse(response, jsonParseHelper);
      if (isObject(packet) && isObject(packet.ctrl)) {
        const { code, text, params } = packet.ctrl;
        return {
          code: typeof code === 'number' ? code : status,
          text: typeof text === 'string' ? text : statusText,
          params: isObject(params) ? params : undefined,
        };
      }
    }
  } catch {
    onInvalid();
  }
  return { code: status, text: statusText };
}

export function addURLParam(url: string, key: string, value: string): string {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.substring(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.substring(0, hashIndex) : url;
  const separator = withoutHash.includes('?') ? '&' : '?';
  const param = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  const joined =
    withoutHash.endsWith('?') || withoutHash.endsWith('&')
      ? withoutHash + param
      : withoutHash + separator + param;
  return joined + hash;
}

export default class LargeFileHelper {
  _tinode: LargeFileTinode;
  _version: string;
  _apiKey: string;
  _authToken: ReturnType<Tinode['getAuthToken']>;
  xhr: XHRLike[];
  onProgress: ProgressCallback | undefined = undefined;

  constructor(tinode: LargeFileTinode, version: string) {
    this._tinode = tinode;
    this._version = version;

    this._apiKey = tinode._apiKey;
    this._authToken = tinode.getAuthToken();

    this.xhr = [];
  }

  uploadWithBaseUrl(
    baseUrl: string | null | undefined,
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string> {
    let url = `/v${this._version}/file/u/`;
    if (baseUrl) {
      let base = baseUrl;
      if (base.endsWith('/')) {
        base = base.slice(0, -1);
      }
      if (base.startsWith('http://') || base.startsWith('https://')) {
        url = base + url;
      } else {
        throw new Error(`Invalid base URL '${baseUrl}'`);
      }
    }

    const Provider = resolveXHRProvider();
    const xhr = new Provider();
    this.xhr.push(xhr);

    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-Tinode-APIKey', this._apiKey);
    if (this._authToken) {
      xhr.setRequestHeader('X-Tinode-Auth', `Token ${this._authToken.token}`);
    }

    const deferred = createDeferred<string>();
    const result = deferred.promise;
    const toResolve = deferred.resolve;
    const toReject = deferred.reject;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        if (onProgress) {
          onProgress(e.loaded / e.total);
        }
        if (this.onProgress) {
          this.onProgress(e.loaded / e.total);
        }
      }
    };

    xhr.onload = () => {
      const ctrl = parseCtrl(xhr.response, xhr.status, xhr.statusText, () =>
        this._tinode.logger(
          'ERROR: Invalid server response in LargeFileHelper',
          xhr.response
        )
      );

      if (xhr.status >= 200 && xhr.status < 300) {
        const uploadedUrl = ctrl.params?.url;
        if (typeof uploadedUrl === 'string') {
          toResolve(uploadedUrl);
        } else toReject(new CommError(ctrl.text, ctrl.code));
        if (onSuccess) {
          onSuccess(ctrl);
        }
      } else if (xhr.status >= 400) {
        toReject(new CommError(ctrl.text, ctrl.code));
        if (onFailure) {
          onFailure(ctrl);
        }
      } else {
        this._tinode.logger(
          'ERROR: Unexpected server response status',
          xhr.status,
          xhr.response
        );
      }
    };

    xhr.onerror = (e) => {
      toReject(e || new Error('failed'));
      if (onFailure) {
        onFailure(null);
      }
    };

    xhr.onabort = () => {
      toReject(new Error('upload cancelled by user'));
      if (onFailure) {
        onFailure(null);
      }
    };

    try {
      const form = new FormData();
      form.append('file', data);
      const id = this._tinode.getNextUniqueId();
      if (id) {
        form.append('id', id);
      }
      if (avatarFor) {
        form.append('topic', avatarFor);
      }
      xhr.send(form);
    } catch (err) {
      toReject(err);
      if (onFailure) {
        onFailure(null);
      }
    }

    return result;
  }

  upload(
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string> {
    const baseUrl =
      (this._tinode._secure ? 'https://' : 'http://') + this._tinode._host;
    return this.uploadWithBaseUrl(
      baseUrl,
      data,
      avatarFor,
      onProgress,
      onSuccess,
      onFailure
    );
  }

  download(
    relativeUrl: string,
    filename?: string,
    mimetype?: string,
    onProgress?: ProgressCallback | null,
    onError?: DownloadErrorCallback | null
  ): Promise<Blob | void> | undefined {
    if (!isUrlRelative(relativeUrl)) {
      if (onError) {
        onError(`The URL '${relativeUrl}' must be relative, not absolute`);
      }
      return;
    }
    if (!this._authToken) {
      if (onError) {
        onError('Must authenticate first');
      }
      return;
    }

    const Provider = resolveXHRProvider();
    const xhr = new Provider();
    this.xhr.push(xhr);

    const url = addURLParam(relativeUrl, 'asatt', '1');

    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Tinode-APIKey', this._apiKey);
    xhr.setRequestHeader('X-Tinode-Auth', 'Token ' + this._authToken.token);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (onProgress) {
        onProgress(e.loaded);
      }
    };

    const deferred = createDeferred<Blob | void>();
    const result = deferred.promise;
    const toResolve = deferred.resolve;
    const toReject = deferred.reject;

    const saveInBrowser = (doc: BrowserDocument, blob: Blob): void => {
      const objectUrls = getObjectUrlFactory();
      if (!objectUrls) {
        throw new Error('URL.createObjectURL is not available');
      }
      const link = doc.createElement('a');
      link.href = objectUrls.createObjectURL(
        new Blob([blob], { type: mimetype ?? '', lastModified: Date.now() })
      );
      link.style.display = 'none';
      link.setAttribute('download', filename ?? '');
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      objectUrls.revokeObjectURL(link.href);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const doc = getBrowserDocument();
        try {
          if (!isBlob(xhr.response)) {
            throw new Error('Server response is not a Blob');
          }
          if (doc) {
            saveInBrowser(doc, xhr.response);
            toResolve();
          } else toResolve(xhr.response);
        } catch (err) {
          toReject(err);
        }
      } else if (xhr.status >= 400) {
        const reject = toReject;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const pkt: unknown = JSON.parse(
              String(reader.result),
              jsonParseHelper
            );
            const ctrl = isObject(pkt) ? pkt.ctrl : undefined;
            if (!isObject(ctrl)) {
              throw new Error('Invalid server response');
            }
            reject(new CommError(String(ctrl.text), Number(ctrl.code)));
          } catch (err) {
            this._tinode.logger(
              'ERROR: Invalid server response in LargeFileHelper',
              reader.result
            );
            reject(err);
          }
        };
        if (isBlob(xhr.response)) {
          reader.readAsText(xhr.response);
        } else {
          reject(new CommError('Download failed', xhr.status));
        }
      }
    };

    xhr.onerror = (e) => {
      toReject(new Error('failed'));
      if (onError) {
        onError(e);
      }
    };

    xhr.onabort = () => {
      toReject(null);
    };

    try {
      xhr.send();
    } catch (err) {
      toReject(err);
      if (onError) {
        onError(err);
      }
    }

    return result;
  }

  cancel(): void {
    this.xhr.forEach((req) => {
      if (req.readyState < 4) {
        req.abort();
      }
    });
  }

  static setNetworkProvider(xhrProvider?: XHRProviderType): void {
    XHRProvider = xhrProvider;
  }
}
