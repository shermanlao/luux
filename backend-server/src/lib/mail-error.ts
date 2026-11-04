export class MailRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailRequestError';
  }
}
