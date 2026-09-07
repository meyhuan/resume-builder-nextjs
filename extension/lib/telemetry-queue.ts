import { eventNames, sanitizeExtensionMetrics } from "../../shared/extension-telemetry";
export type TelemetryName = typeof eventNames[number];
const KEY = "telemetryOutboxV1";
const TTL = 7 * 86400_000;
const LIMIT = 100;
interface Entry {
  eventId: string; eventName: TelemetryName; occurredAt: string;
  properties: Record<string, string | number | boolean>;
  owner: string; attempts: number; nextAttemptAt: number;
}
interface Dependencies {
  storage: { get(key: string | string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string | string[]): Promise<void> };
  send(token: string, event: Omit<Entry, "owner" | "attempts" | "nextAttemptAt">): Promise<number>;
  schedule(): Promise<void>;
  now?: () => number;
}
export function createTelemetryQueue(deps: Dependencies) {
  const now = deps.now || Date.now;
  let writes: Promise<unknown> = Promise.resolve();
  let flushing: Promise<void> | null = null;
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const next = writes.then(work);
    writes = next.catch(() => undefined);
    return next;
  };
  const read = async (): Promise<Entry[]> => {
    const stored = (await deps.storage.get(KEY))[KEY];
    return Array.isArray(stored) ? stored.filter((item): item is Entry => !!item && typeof item.eventId === "string" && typeof item.owner === "string" && eventNames.includes(item.eventName) && Number.isFinite(Date.parse(item.occurredAt)) && now() - Date.parse(item.occurredAt) < TTL) : [];
  };
  const auth = async () => {
    const data = await deps.storage.get(["accessToken", "onboardingAccepted"]);
    if (typeof data.accessToken !== "string" || !data.accessToken || data.onboardingAccepted !== true) return null;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.accessToken));
    return { token: data.accessToken, owner: [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("") };
  };
  async function enqueue(eventName: unknown, properties: unknown = {}): Promise<void> {
    if (!eventNames.includes(eventName as TelemetryName)) return;
    await exclusive(async () => {
      const context = await auth();
      if (!context) return;
      const queue = (await read()).filter(item => item.owner === context.owner);
      queue.push({ eventId: crypto.randomUUID(), eventName: eventName as TelemetryName, occurredAt: new Date(now()).toISOString(),
        properties: sanitizeExtensionMetrics(properties), owner: context.owner, attempts: 0, nextAttemptAt: 0 });
      const dropped = Math.max(0, queue.length - LIMIT);
      await deps.storage.set({ [KEY]: queue.slice(-LIMIT), ...(dropped ? {telemetryLastDropAt: now()} : {}) });
    });
    await deps.schedule();
  }
  async function runFlush() {
    for (let i = 0; i < 10; i++) {
      const context = await auth();
      if (!context) return;
      const entry = await exclusive(async () => {
        const queue = (await read()).filter(item => item.owner === context.owner);
        await deps.storage.set({ [KEY]: queue });
        return queue.find(item => item.nextAttemptAt <= now());
      });
      if (!entry) return;
      let status = 0;
      try {
        status = await deps.send(context.token, {eventId: entry.eventId, eventName: entry.eventName, occurredAt: entry.occurredAt, properties: sanitizeExtensionMetrics(entry.properties)});
      } catch { /* Keep a durable retry; never interfere with filling. */ }
      await exclusive(async () => {
        const queue = await read();
        const index = queue.findIndex(item => item.eventId === entry.eventId);
        if (index === -1) return;
        // A permanent bad event is dropped; transient/network/auth errors are retained.
        if (status === 204 || [400, 413, 422].includes(status)) queue.splice(index, 1);
        else queue[index] = {...entry, attempts: entry.attempts + 1, nextAttemptAt: now() + Math.min(300_000, 30_000 * 2 ** Math.min(entry.attempts, 4))};
        await deps.storage.set({[KEY]: queue, telemetryLastDelivery: {status, at: now(), pending: queue.length}});
      });
      if (status !== 204 && ![400, 413, 422].includes(status)) return;
    }
  }
  function flush(): Promise<void> {
    if (!flushing) flushing = runFlush().catch(() => undefined).finally(async () => {
      try { if ((await read()).length) await deps.schedule(); } catch { /* Retain queue on storage failure. */ }
      flushing = null;
    });
    return flushing;
  }
  const clear = () => exclusive(() => deps.storage.remove([KEY, "telemetryLastDelivery", "telemetryLastDropAt"]));
  return { enqueue, flush, clear };
}
