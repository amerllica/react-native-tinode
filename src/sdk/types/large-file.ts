import type { LargeFileXHRProvider, XHRLike } from './network';
import type { Tinode } from './tinode';

type LargeFileTinode = Pick<
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
interface ServerCtrl {
  code: number;
  text: string;
  params?: Record<string, unknown>;
}
type ProgressCallback = (progress: number) => void;
type SuccessCallback = (ctrl: ServerCtrl) => void;
type FailureCallback = (ctrl: ServerCtrl | null) => void;
type DownloadErrorCallback = (err: unknown) => void;
export declare class LargeFileHelper {
  _tinode: LargeFileTinode;
  _version: string;
  _apiKey: string;
  _authToken: ReturnType<Tinode['getAuthToken']>;
  xhr: XHRLike[];
  onProgress: ProgressCallback | undefined;
  constructor(tinode: LargeFileTinode, version: string);
  uploadWithBaseUrl(
    baseUrl: string | null | undefined,
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string>;
  upload(
    data: UploadData,
    avatarFor?: string | null,
    onProgress?: ProgressCallback | null,
    onSuccess?: SuccessCallback | null,
    onFailure?: FailureCallback | null
  ): Promise<string>;
  download(
    relativeUrl: string,
    filename?: string,
    mimetype?: string,
    onProgress?: ProgressCallback | null,
    onError?: DownloadErrorCallback | null
  ): Promise<Blob | void> | undefined;
  cancel(): void;
  static setNetworkProvider(xhrProvider?: LargeFileXHRProvider): void;
}
