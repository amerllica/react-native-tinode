type AccessValue = number | string | null | undefined;
export interface AccessModeInput {
  given?: AccessValue;
  want?: AccessValue;
  mode?: AccessValue;
}
export interface AccessModeJson {
  mode: string | null;
  given: string | null;
  want: string | null;
}
export declare class AccessMode {
  #private;
  static readonly _NONE = 0;
  static readonly _JOIN = 1;
  static readonly _READ = 2;
  static readonly _WRITE = 4;
  static readonly _PRES = 8;
  static readonly _APPROVE = 16;
  static readonly _SHARE = 32;
  static readonly _DELETE = 64;
  static readonly _OWNER = 128;
  static readonly _BITMASK: number;
  static readonly _INVALID = 1048576;
  given?: number | null;
  want?: number | null;
  mode?: number | null;
  constructor(acs?: AccessModeInput | null);
  static decode(str: AccessValue): number | null;
  static encode(val: number | null | undefined): string | null;
  static update(
    val: number | null | undefined,
    upd: AccessValue
  ): number | null | undefined;
  static diff(a1: AccessValue, a2: AccessValue): number;
  toString(): string;
  jsonHelper(): AccessModeJson;
  setMode(m: AccessValue): this;
  updateMode(u: AccessValue): this;
  getMode(): string | null;
  setGiven(g: AccessValue): this;
  updateGiven(u: AccessValue): this;
  getGiven(): string | null;
  setWant(w: AccessValue): this;
  updateWant(u: AccessValue): this;
  getWant(): string | null;
  getMissing(): string | null;
  getExcessive(): string | null;
  updateAll(val?: AccessModeInput | null): this;
  isOwner(side?: string): boolean;
  isPresencer(side?: string): boolean;
  isMuted(side?: string): boolean;
  isJoiner(side?: string): boolean;
  isReader(side?: string): boolean;
  isWriter(side?: string): boolean;
  isApprover(side?: string): boolean;
  isAdmin(side?: string): boolean;
  isSharer(side?: string): boolean;
  isDeleter(side?: string): boolean;
}
