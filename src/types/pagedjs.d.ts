/**
 * Type declarations for pagedjs (no official @types package available)
 */

declare module 'pagedjs' {
  export class Previewer {
    constructor()
    /**
     * Run pagination on the current document.
     * Returns a promise that resolves when pagination is complete.
     */
    preview(): Promise<void>
  }
}
