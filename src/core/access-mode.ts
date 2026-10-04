export type AccessSide = 'given' | 'want' | 'mode';

export type AccessValue = number | string | null | undefined;

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

const FLAG_LETTERS = ['J', 'R', 'W', 'P', 'A', 'S', 'D', 'O'] as const;

function isAccessSide(side: string): side is AccessSide {
  return side === 'given' || side === 'want' || side === 'mode';
}

export default class AccessMode {
  static readonly _NONE = 0x00;
  static readonly _JOIN = 0x01;
  static readonly _READ = 0x02;
  static readonly _WRITE = 0x04;
  static readonly _PRES = 0x08;
  static readonly _APPROVE = 0x10;
  static readonly _SHARE = 0x20;
  static readonly _DELETE = 0x40;
  static readonly _OWNER = 0x80;
  static readonly _BITMASK =
    AccessMode._JOIN |
    AccessMode._READ |
    AccessMode._WRITE |
    AccessMode._PRES |
    AccessMode._APPROVE |
    AccessMode._SHARE |
    AccessMode._DELETE |
    AccessMode._OWNER;
  static readonly _INVALID = 0x100000;

  given?: number | null;
  want?: number | null;
  mode?: number | null;

  constructor(acs?: AccessModeInput | null) {
    if (acs) {
      this.given =
        typeof acs.given === 'number'
          ? acs.given
          : AccessMode.decode(acs.given);
      this.want =
        typeof acs.want === 'number' ? acs.want : AccessMode.decode(acs.want);
      this.mode = acs.mode
        ? typeof acs.mode === 'number'
          ? acs.mode
          : AccessMode.decode(acs.mode)
        : (this.given ?? 0) & (this.want ?? 0);
    }
  }

  static #checkFlag(
    val: AccessMode,
    side: string | undefined,
    flag: number
  ): boolean {
    const component = side || 'mode';
    if (isAccessSide(component)) {
      return ((val[component] ?? 0) & flag) !== 0;
    }
    throw new Error(`Invalid AccessMode component '${component}'`);
  }

  static decode(str: AccessValue): number | null {
    if (!str) {
      return null;
    } else if (typeof str === 'number') {
      return str & AccessMode._BITMASK;
    } else if (str === 'N' || str === 'n') {
      return AccessMode._NONE;
    }

    const bitmask: Record<string, number> = {
      J: AccessMode._JOIN,
      R: AccessMode._READ,
      W: AccessMode._WRITE,
      P: AccessMode._PRES,
      A: AccessMode._APPROVE,
      S: AccessMode._SHARE,
      D: AccessMode._DELETE,
      O: AccessMode._OWNER,
    };

    let m0 = AccessMode._NONE;

    for (let i = 0; i < str.length; i++) {
      const bit = bitmask[str.charAt(i).toUpperCase()];
      if (!bit) {
        continue;
      }
      m0 |= bit;
    }
    return m0;
  }

  static encode(val: number | null | undefined): string | null {
    if (val === null || val === AccessMode._INVALID) {
      return null;
    } else if (val === AccessMode._NONE) {
      return 'N';
    }

    let res = '';
    for (let i = 0; i < FLAG_LETTERS.length; i++) {
      if (((val ?? 0) & (1 << i)) !== 0) {
        res = res + FLAG_LETTERS[i];
      }
    }
    return res;
  }

  static update(
    val: number | null | undefined,
    upd: AccessValue
  ): number | null | undefined {
    if (!upd || typeof upd !== 'string') {
      return val;
    }

    let action = upd.charAt(0);
    if (action === '+' || action === '-') {
      let val0 = val;
      const parts = upd.split(/([-+])/);
      for (let i = 1; i < parts.length - 1; i += 2) {
        action = parts[i] ?? '';
        const m0 = AccessMode.decode(parts[i + 1]);
        if (m0 === AccessMode._INVALID) {
          return val;
        }
        if (m0 === null) {
          continue;
        }
        if (action === '+') {
          val0 = (val0 ?? 0) | m0;
        } else if (action === '-') {
          val0 = (val0 ?? 0) & ~m0;
        }
      }
      return val0;
    }

    const val0 = AccessMode.decode(upd);
    return val0 !== AccessMode._INVALID ? val0 : val;
  }

  static diff(a1: AccessValue, a2: AccessValue): number {
    const m1 = AccessMode.decode(a1);
    const m2 = AccessMode.decode(a2);

    if (m1 === AccessMode._INVALID || m2 === AccessMode._INVALID) {
      return AccessMode._INVALID;
    }
    return (m1 ?? 0) & ~(m2 ?? 0);
  }

  toString(): string {
    return (
      '{"mode": "' +
      AccessMode.encode(this.mode) +
      '", "given": "' +
      AccessMode.encode(this.given) +
      '", "want": "' +
      AccessMode.encode(this.want) +
      '"}'
    );
  }

  jsonHelper(): AccessModeJson {
    return {
      mode: AccessMode.encode(this.mode),
      given: AccessMode.encode(this.given),
      want: AccessMode.encode(this.want),
    };
  }

  setMode(m: AccessValue): this {
    this.mode = AccessMode.decode(m);
    return this;
  }

  updateMode(u: AccessValue): this {
    this.mode = AccessMode.update(this.mode, u);
    return this;
  }

  getMode(): string | null {
    return AccessMode.encode(this.mode);
  }

  setGiven(g: AccessValue): this {
    this.given = AccessMode.decode(g);
    return this;
  }

  updateGiven(u: AccessValue): this {
    this.given = AccessMode.update(this.given, u);
    return this;
  }

  getGiven(): string | null {
    return AccessMode.encode(this.given);
  }

  setWant(w: AccessValue): this {
    this.want = AccessMode.decode(w);
    return this;
  }

  updateWant(u: AccessValue): this {
    this.want = AccessMode.update(this.want, u);
    return this;
  }

  getWant(): string | null {
    return AccessMode.encode(this.want);
  }

  getMissing(): string | null {
    return AccessMode.encode((this.want ?? 0) & ~(this.given ?? 0));
  }

  getExcessive(): string | null {
    return AccessMode.encode((this.given ?? 0) & ~(this.want ?? 0));
  }

  updateAll(val?: AccessModeInput | null): this {
    if (val) {
      this.updateGiven(val.given);
      this.updateWant(val.want);
      this.mode = (this.given ?? 0) & (this.want ?? 0);
    }
    return this;
  }

  isOwner(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._OWNER);
  }

  isPresencer(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._PRES);
  }

  isMuted(side?: string): boolean {
    return !this.isPresencer(side);
  }

  isJoiner(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._JOIN);
  }

  isReader(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._READ);
  }

  isWriter(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._WRITE);
  }

  isApprover(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._APPROVE);
  }

  isAdmin(side?: string): boolean {
    return this.isOwner(side) || this.isApprover(side);
  }

  isSharer(side?: string): boolean {
    return (
      this.isAdmin(side) || AccessMode.#checkFlag(this, side, AccessMode._SHARE)
    );
  }

  isDeleter(side?: string): boolean {
    return AccessMode.#checkFlag(this, side, AccessMode._DELETE);
  }
}
