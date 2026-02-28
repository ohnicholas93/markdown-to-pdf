declare module 'pagedjs' {
  export class Previewer {
    constructor(options?: unknown)
    polisher?: {
      destroy?: () => void
    }
    preview(
      content?: DocumentFragment | HTMLElement | null,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: HTMLElement | null,
    ): Promise<{
      total?: number
    }>
  }
}
