export type DateCompletionPolicy = "ask" | "first-day" | "manual";

export function isDateCompletionPolicy(value: unknown): value is DateCompletionPolicy {
  return value === "ask" || value === "first-day" || value === "manual";
}

export function datePolicyKey(url: string): string {
  const site = new URL(url);
  if (!/^https?:$/.test(site.protocol)) throw new Error("请在招聘网站设置日期偏好");
  return `date-completion:${site.origin}`;
}

interface PreferenceStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export async function readDatePolicy(storage: PreferenceStorage, url: string): Promise<DateCompletionPolicy> {
  const key = datePolicyKey(url);
  const value = (await storage.get(key))[key];
  return isDateCompletionPolicy(value) ? value : "ask";
}

export async function writeDatePolicy(storage: PreferenceStorage, url: string, value: unknown): Promise<void> {
  if (!isDateCompletionPolicy(value)) throw new Error("无效的日期补全选项");
  const key = datePolicyKey(url);
  if (value === "ask") await storage.remove(key);
  else await storage.set({ [key]: value });
}
