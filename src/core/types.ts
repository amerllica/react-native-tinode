import type AccessMode from './access-mode';
import type { AccessModeInput } from './access-mode';
import type { DraftyDoc } from './drafty';
import type { GetQuery } from './meta-builder';
import type { SeqRange } from './utils';

export type { GetQuery, SeqRange };

export type TopicType = 'me' | 'fnd' | 'grp' | 'p2p' | 'sys' | 'slf';

export interface DefAcs {
  auth?: string;
  anon?: string;
}

export interface AuthToken {
  token: string;
  expires: Date;
}

export interface Credential {
  meth: string;
  val?: string;
  resp?: string;
  params?: unknown;
  done?: boolean;
}

export interface LastSeen {
  when?: Date;
  ua?: string;
}

export interface TopicPrivate {
  arch?: boolean;
  tpin?: string[];
  comment?: string;
  [key: string]: unknown;
}

export interface TopicDesc {
  created?: Date;
  updated?: Date;
  touched?: Date;
  deleted?: Date;
  defacs?: DefAcs;
  acs?: AccessMode;
  seq?: number;
  read?: number;
  recv?: number;
  clear?: number;
  unread?: number;
  subcnt?: number;
  online?: boolean;
  seen?: LastSeen;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  _noForwarding?: boolean;
}

export interface TopicSubscription {
  user?: string;
  topic?: string;
  created?: Date;
  updated?: Date;
  touched?: Date;
  deleted?: Date;
  acs?: AccessMode;
  mode?: string;
  seq?: number;
  read?: number;
  recv?: number;
  clear?: number;
  unread?: number;
  online?: boolean;
  seen?: LastSeen;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  _noForwarding?: boolean;
}

export interface MessageHead {
  'mime'?: string;
  'replace'?: string;
  'forwarded'?: string;
  'webrtc'?: string;
  'webrtc-duration'?: number;
  'vc'?: boolean;
  [key: string]: unknown;
}

export interface Message {
  id?: string;
  topic: string;
  seq: number;
  from?: string;
  ts?: Date;
  head?: MessageHead | null;
  content?: DraftyDoc | string;
  noecho?: boolean;
  low?: number;
  hi?: number;
  _deleted?: boolean;
  _sending?: boolean;
  _failed?: boolean;
  _fatal?: boolean;
  _cancelled?: boolean;
  _status?: number;
  _noForwarding?: boolean;
  _origTs?: Date;
  _origSeq?: number;
}

export interface PubMessage extends Omit<Message, 'seq'> {
  seq?: number;
}

export interface CtrlParams {
  what?: string;
  count?: number;
  seq?: number;
  del?: number;
  acs?: AccessMode;
  user?: string;
  token?: string;
  expires?: Date;
  unsub?: boolean;
  ver?: string;
  build?: string;
  sid?: string;
  [key: string]: unknown;
}

export interface CtrlMessage {
  id?: string;
  topic?: string;
  code: number;
  text?: string;
  ts?: Date;
  params?: CtrlParams;
}

export interface DataMessage {
  topic: string;
  from?: string;
  ts: Date;
  seq: number;
  head?: MessageHead;
  content?: DraftyDoc | string;
}

export interface DelValues {
  clear: number;
  delseq: SeqRange[];
}

export interface MetaMessage {
  id?: string;
  topic: string;
  ts?: Date;
  desc?: TopicDesc;
  sub?: TopicSubscription[];
  tags?: string[];
  cred?: Credential[];
  del?: DelValues;
  aux?: Record<string, unknown>;
}

export type PresWhat =
  | 'on'
  | 'off'
  | 'ua'
  | 'upd'
  | 'gone'
  | 'acs'
  | 'term'
  | 'msg'
  | 'read'
  | 'recv'
  | 'del'
  | 'tags'
  | 'aux';

export interface PresMessage {
  topic?: string;
  src?: string;
  what: PresWhat;
  seq?: number;
  clear?: number;
  delseq?: SeqRange[];
  ua?: string;
  act?: string;
  tgt?: string;
  dacs?: AccessModeInput;
  _noForwarding?: boolean;
}

export type InfoWhat = 'kp' | 'kpa' | 'kpv' | 'recv' | 'read' | 'call';

export interface InfoMessage {
  topic?: string;
  src?: string;
  from?: string;
  what: InfoWhat;
  seq?: number;
  event?: string;
  payload?: unknown;
  _noForwarding?: boolean;
}

export interface ServerMessage {
  ctrl?: CtrlMessage;
  data?: DataMessage;
  meta?: MetaMessage;
  pres?: PresMessage;
  info?: InfoMessage;
}

export interface ServerParams {
  ver?: string;
  build?: string;
  sid?: string;
  [key: string]: unknown;
}

export interface SetDesc {
  defacs?: DefAcs;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  acs?: AccessMode;
  updated?: Date;
  _noForwarding?: boolean;
}

export interface SetSub {
  user?: string | null;
  mode?: string | null;
  topic?: string;
  acs?: AccessMode;
  updated?: Date;
  _noForwarding?: boolean;
}

export interface SetParams {
  desc?: SetDesc;
  sub?: SetSub;
  tags?: string[];
  cred?: Credential;
  aux?: Record<string, unknown>;
  attachments?: string[];
}

export interface AccountParams {
  defacs?: DefAcs;
  public?: unknown;
  private?: unknown;
  trusted?: unknown;
  tags?: string[];
  cred?: Credential[];
  scheme?: string;
  secret?: string;
  attachments?: string[];
}

export interface HiPacket {
  id?: string;
  ver?: string;
  ua?: string;
  dev?: string | null;
  lang?: string;
  platf?: string;
}

export interface AccPacket {
  id?: string;
  user: string | null;
  scheme: string | null;
  secret: string | null;
  tmpscheme?: string;
  tmpsecret?: string;
  login?: boolean;
  tags?: string[];
  desc: SetDesc;
  cred?: Credential[];
}

export interface LoginPacket {
  id?: string;
  scheme: string;
  secret: string;
  cred?: Credential[] | null;
}

export interface SubPacket {
  id?: string;
  topic: string;
  get?: GetQuery;
  set: {
    desc?: SetDesc;
    sub?: SetSub;
    tags?: string[];
    aux?: Record<string, unknown>;
  };
}

export interface LeavePacket {
  id?: string;
  topic: string;
  unsub?: boolean;
}

export interface GetPacket extends GetQuery {
  id?: string;
  topic: string;
}

export interface SetPacket {
  id?: string;
  topic: string;
  desc?: SetDesc;
  sub?: SetSub;
  tags?: string[];
  cred?: Credential;
  aux?: Record<string, unknown>;
}

export type DelWhat = 'msg' | 'topic' | 'sub' | 'cred' | 'user';

export interface DelPacket {
  id?: string;
  topic: string | null;
  what: DelWhat;
  delseq?: SeqRange[];
  user?: string;
  cred?: { meth: string; val: string };
  hard?: boolean;
}

export type NoteWhat = 'recv' | 'read' | 'kp' | 'kpa' | 'kpv' | 'call';

export interface NotePacket {
  id?: string;
  topic: string;
  what: NoteWhat;
  seq?: number;
  event?: string;
  payload?: unknown;
}

export interface ClientMessage {
  hi?: HiPacket;
  acc?: AccPacket;
  login?: LoginPacket;
  sub?: SubPacket;
  leave?: LeavePacket;
  pub?: PubMessage;
  get?: GetPacket;
  set?: SetPacket;
  del?: DelPacket;
  note?: NotePacket;
  extra?: { attachments: string[] };
}

export interface PushPayload {
  what: string;
  topic?: string;
  seq?: number;
  xfrom?: string;
  modeGiven?: string;
  modeWant?: string;
}
