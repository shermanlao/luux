declare module 'imapflow' {
  export type ImapFetchedMessage = { source?: Buffer };

  export class ImapFlow {
    constructor(options: {
      host: string;
      port: number;
      secure?: boolean;
      auth: { user: string; pass?: string };
      logger?: false;
      connectionTimeout?: number;
      greetingTimeout?: number;
      socketTimeout?: number;
    });
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(path: string): Promise<{ release: () => void }>;
    search(query: { since?: Date }, options?: { uid?: boolean }): Promise<number[] | false>;
    fetch(
      range: number[],
      query: { source?: boolean },
      options?: { uid?: boolean }
    ): AsyncIterable<ImapFetchedMessage>;
  }
}
