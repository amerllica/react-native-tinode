export default class CommError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(`${message} (${code})`);
    this.name = 'CommError';
    this.code = code;
  }
}
