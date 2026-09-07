export interface PageIdentity { tabId: number; url: string }
export interface PageSession {
  page: PageIdentity;
  application: Record<string, unknown> | null;
  submitDetected: boolean;
}
export function samePage(a?: PageIdentity | null, b?: PageIdentity | null): boolean {
  return !!a && !!b && a.tabId === b.tabId && a.url === b.url;
}
export function pageSessionKey(tabId: number): string { return `application-page:${tabId}`; }
export function matchingSession(value: unknown, page: PageIdentity | null): PageSession | null {
  const session = value as PageSession | undefined;
  return samePage(session?.page, page) ? session! : null;
}
