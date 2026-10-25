import type { CardData } from './the-card';

type DraftyEntityType =
  'AU' | 'BN' | 'EX' | 'HT' | 'IM' | 'LN' | 'MN' | 'TC' | 'VC' | 'VD';
type DraftyStyleType =
  | DraftyEntityType
  | 'BR'
  | 'CO'
  | 'DL'
  | 'EM'
  | 'FM'
  | 'HD'
  | 'HL'
  | 'QQ'
  | 'RW'
  | 'ST';
type DraftyJsonObject = {
  readonly [key: string]: unknown;
};
export interface DraftyEntData extends CardData {
  act?: string;
  aonly?: boolean;
  duration?: number;
  height?: number;
  incoming?: boolean;
  mime?: string;
  name?: string;
  premime?: string;
  preref?: string;
  preview?: string;
  ref?: string;
  size?: number;
  state?: string;
  title?: string;
  url?: string;
  val?: string | DraftyJsonObject;
  vc?: boolean;
  width?: number;
  _tempPreview?: string;
  _processing?: boolean;
}
export interface DraftyFmt {
  at?: number;
  len?: number;
  tp?: DraftyStyleType;
  key?: number;
}
export interface DraftyEnt {
  tp: DraftyStyleType;
  data?: DraftyEntData;
}
export interface DraftyDoc {
  txt?: string;
  fmt?: DraftyFmt[];
  ent?: DraftyEnt[];
}
export type DraftySource = DraftyDoc | string | null | undefined;
export interface DraftyNode {
  type?: DraftyStyleType;
  text?: string;
  data?: DraftyEntData;
  key?: number;
  att?: boolean;
  children?: DraftyNode[] | null;
  parent?: DraftyNode;
}
export type DraftyFormatter<R> = (
  style: DraftyStyleType | undefined,
  data: DraftyEntData | undefined,
  values: (R | string)[] | null,
  index: number,
  stack: DraftyStyleType[] | undefined
) => R | null | undefined;
type DraftyEntityCallback = (
  data: DraftyEntData | undefined,
  index: number,
  tp: DraftyStyleType
) => unknown;
type DraftyStyleCallback = (
  tp: DraftyStyleType | undefined,
  at: number | undefined,
  len: number | undefined,
  key: number | undefined,
  index: number
) => unknown;
type DraftyLogger = (message: string, ...args: unknown[]) => void;
type DraftyAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;
interface ImageDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  width?: number;
  height?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<string>;
}
interface VideoDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  preview?: string;
  preref?: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  size?: number;
  _tempPreview?: string;
  urlPromise?: Promise<[string | undefined, string | undefined]>;
}
interface AudioDesc {
  mime?: string;
  refurl?: string;
  bits?: string;
  duration?: number;
  preview?: string;
  filename?: string;
  size?: number;
  urlPromise?: Promise<string>;
}
interface AttachmentDesc {
  mime?: string;
  data?: string;
  filename?: string;
  size?: number;
  refurl?: string;
  urlPromise?: Promise<string>;
}
interface LinkData {
  txt: string;
  url: string;
}
interface VideoCallUpdate {
  state?: string;
  duration?: number;
  incoming?: boolean;
  vc?: boolean;
}
type ButtonActionType = 'url' | 'pub';
export declare class Drafty implements DraftyDoc {
  txt: string;
  fmt: DraftyFmt[];
  ent: DraftyEnt[];
  static logger?: DraftyLogger | null;
  static readonly contentType = 'text/x-drafty';
  static init(plainText?: unknown): DraftyDoc | null;
  static parse(content: string): DraftyDoc;
  static parse(content: unknown): DraftyDoc | null;
  static append(first: DraftyDoc, second: DraftySource): DraftyDoc;
  static append(
    first: DraftyDoc | null | undefined,
    second: DraftySource
  ): DraftySource;
  static insertImage(
    content: DraftyDoc | null | undefined,
    at: number,
    imageDesc: ImageDesc
  ): DraftyDoc;
  static insertVideo(
    content: DraftyDoc | null | undefined,
    at: number,
    videoDesc: VideoDesc
  ): DraftyDoc;
  static insertAudio(
    content: DraftyDoc | null | undefined,
    at: number,
    audioDesc: AudioDesc
  ): DraftyDoc;
  static videoCall(audioOnly?: boolean): DraftyDoc;
  static updateVideoCall<T extends DraftyDoc | null | undefined>(
    content: T,
    params: VideoCallUpdate
  ): T;
  static quote(header: string, uid: string, body: DraftySource): DraftyDoc;
  static mention(name: string | null | undefined, uid: string): DraftyDoc;
  static appendLink(
    content: DraftyDoc | null | undefined,
    linkData: LinkData
  ): DraftyDoc;
  static appendImage(
    content: DraftyDoc | null | undefined,
    imageDesc: ImageDesc
  ): DraftyDoc;
  static appendAudio(
    content: DraftyDoc | null | undefined,
    audioDesc: AudioDesc
  ): DraftyDoc;
  static attachFile(
    content: DraftyDoc | null | undefined,
    attachmentDesc: AttachmentDesc
  ): DraftyDoc;
  static wrapInto(
    content: DraftyDoc | string,
    style: DraftyStyleType,
    at?: number,
    len?: number
  ): DraftyDoc;
  static wrapAsForm(
    content: DraftyDoc | string,
    at?: number,
    len?: number
  ): DraftyDoc;
  static insertButton(
    content: DraftySource,
    at: number,
    len: number,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null;
  static appendButton(
    content: DraftyDoc | null | undefined,
    title: string,
    name: string | undefined,
    actionType: ButtonActionType,
    actionValue?: string,
    refUrl?: string
  ): DraftyDoc | null;
  static attachJSON(
    content: DraftyDoc | null | undefined,
    data: DraftyJsonObject
  ): DraftyDoc;
  static appendLineBreak(content: DraftyDoc | null | undefined): DraftyDoc;
  static appendTheCard(
    content: DraftyDoc | null | undefined,
    theCardData: CardData
  ): DraftyDoc;
  static UNSAFE_toHTML(doc: DraftySource): string | null;
  static format<R>(
    original: DraftySource,
    formatter: DraftyFormatter<R>,
    context?: unknown
  ): R | null | undefined;
  static shorten(
    original: DraftySource,
    limit: number,
    light?: boolean
  ): DraftyDoc;
  static forwardedContent(original: DraftySource): DraftyDoc;
  static replyContent(original: DraftySource, limit: number): DraftySource;
  static preview(
    original: DraftySource,
    limit: number,
    forwarding?: boolean
  ): DraftyDoc;
  static toPlainText(content: DraftyDoc | string): string | undefined;
  static isPlainText(content: DraftyDoc | string): boolean;
  static toMarkdown(content: DraftySource): string | null;
  static isValid(content: unknown): boolean;
  static hasAttachments(content: DraftyDoc): boolean;
  static attachments(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void;
  static hasEntities(content: DraftySource): boolean;
  static entities(
    content: DraftyDoc,
    callback: DraftyEntityCallback,
    context?: unknown
  ): void;
  static styles(
    content: DraftyDoc,
    callback: DraftyStyleCallback,
    context?: unknown
  ): void;
  static sanitizeEntities<T extends DraftyDoc | null | undefined>(
    content: T
  ): T;
  static getDownloadUrl(entData: DraftyEntData): string | null;
  static isProcessing(entData: DraftyEntData): boolean;
  static getPreviewUrl(entData: DraftyEntData): string | null;
  static getEntitySize(entData: DraftyEntData): number;
  static getEntityMimeType(entData: DraftyEntData): string;
  static tagName(style: DraftyStyleType | undefined): string | undefined;
  static attrValue(
    style: DraftyStyleType | undefined,
    data: DraftyEntData | null | undefined
  ): DraftyAttributes | null | undefined;
  static getContentType(): string;
  static isFormResponseType(mimeType: string | null | undefined): boolean;
}
