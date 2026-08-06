declare module "jsdom" {
  /** Minimal JSDOM surface used by DOM renderer tests. */
  export class JSDOM {
    /** Browser document created for a test. */
    readonly window: {
      readonly document: Document;
      close(): void;
    };
    /** Creates a browser-like document for a test. */
    constructor(html?: string);
  }
}
