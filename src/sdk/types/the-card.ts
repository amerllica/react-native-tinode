type CardCommProto = 'tel' | 'email' | 'tinode' | 'http' | 'impp';
export interface CardName {
  surname?: string;
  given?: string;
  additional?: string;
  prefix?: string;
  suffix?: string;
}
export interface CardOrg {
  fn?: string;
  title?: string;
}
export interface CardPhoto {
  type?: string;
  data?: string;
  ref?: string;
}
interface CardBirthday {
  y?: number;
  m: number;
  d: number;
}
export interface CardComm {
  proto: CardCommProto;
  des: string[];
  value: string;
}
export interface CardData {
  fn?: string;
  n?: CardName;
  org?: CardOrg;
  note?: string;
  bday?: CardBirthday;
  photo?: CardPhoto | '\u2421';
  comm?: CardComm[];
}
type MaybeCard = CardData | null | undefined;
export interface TheCard extends CardData {}
export declare class TheCard {
  static contentType: string;
  constructor(
    fn?: string,
    imageUrl?: string,
    imageMimeType?: string,
    note?: string
  );
  merge(other: CardData): void;
  get contentType(): string;
  get size(): number;
  static setFn(card: MaybeCard, fn?: string | null): CardData;
  static getFn(card: MaybeCard): string | null;
  static setNote(card: MaybeCard, note?: string | null): CardData;
  static setPhoto(
    card: MaybeCard,
    imageUrl?: string | null,
    imageMimeType?: string | null
  ): CardData;
  static getPhotoUrl(card: MaybeCard): string | null;
  static getOrg(card: MaybeCard): string | null;
  static setPhone(card: MaybeCard, phone: string, type?: string): CardData;
  static setEmail(card: MaybeCard, email: string, type?: string): CardData;
  static setTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type?: string
  ): CardData;
  static addPhone(card: MaybeCard, phone: string, type?: string): CardData;
  static addEmail(card: MaybeCard, email: string, type?: string): CardData;
  static addTinodeID(
    card: MaybeCard,
    tinodeID: string,
    type?: string
  ): CardData;
  static clearPhone<T extends MaybeCard>(
    card: T,
    phone?: string,
    type?: string
  ): T;
  static clearEmail<T extends MaybeCard>(
    card: T,
    email?: string,
    type?: string
  ): T;
  static clearTinodeID<T extends MaybeCard>(
    card: T,
    tinodeID?: string,
    type?: string
  ): T;
  static getComm(card: MaybeCard, proto: string): CardComm[];
  static getEmails(card: MaybeCard): string[];
  static getPhones(card: MaybeCard): string[];
  static getFirstTinodeID(card: MaybeCard): string | null;
  static exportVCard(card: MaybeCard): string | null;
  static importVCard(vcardStr: unknown): CardData | null;
  static isFileSupported(type?: string | null, name?: string | null): boolean;
}
