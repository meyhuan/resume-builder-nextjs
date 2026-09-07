import { expect, it, vi } from "vitest";
import { createTelemetryQueue } from "./telemetry-queue";

function fixture() {
  let clock = Date.now();
  const values: Record<string, unknown> = {accessToken:"token-1",onboardingAccepted:true};
  const storage = {
    get: async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, structuredClone(values[key])])),
    set: async (data: Record<string, unknown>) => {Object.assign(values, structuredClone(data));},
    remove: async (keys: string | string[]) => {(Array.isArray(keys) ? keys : [keys]).forEach(key => {delete values[key];});},
  };
  const send = vi.fn(async () => 204);
  const schedule = vi.fn(async () => {});
  const deps = {storage,send,schedule,now:()=>clock};
  return {values,send,schedule,deps,queue:createTelemetryQueue(deps),advance:(ms:number)=>{clock+=ms;}};
}

it("requires token and onboarding consent, and does not persist sensitive properties", async () => {
  const f=fixture(); f.values.onboardingAccepted=false;
  await f.queue.enqueue("extension_fill_result",{filledCount:1});
  expect(f.values.telemetryOutboxV1).toBeUndefined();
  f.values.onboardingAccepted=true;
  await f.queue.enqueue("extension_fill_result",{filledCount:1, resume:"private", sourceDomain:"site.test/?email=private"});
  expect(JSON.stringify(f.values.telemetryOutboxV1)).not.toContain("private");
  expect(JSON.stringify(f.values.telemetryOutboxV1)).not.toContain("token-1");
  await f.queue.flush();
  expect(f.send).toHaveBeenCalledOnce();
  expect(f.values.telemetryOutboxV1).toEqual([]);
});

it("persists an offline event, retries after restart with the same ID and backs off", async () => {
  const f=fixture(); f.send.mockResolvedValueOnce(503);
  await f.queue.enqueue("extension_fill_result",{filledCount:2});
  await f.queue.flush();
  const sent = f.send.mock.calls[0];
  await f.queue.flush();
  expect(f.send).toHaveBeenCalledTimes(1);
  f.advance(30_001);
  await createTelemetryQueue(f.deps).flush();
  expect(f.send.mock.calls[1]).toEqual(sent);
  expect(f.values.telemetryOutboxV1).toEqual([]);
});

it("serializes parallel enqueue and overlapping flush without losing events", async () => {
  const f=fixture();
  await Promise.all(Array.from({length:10},(_,i)=>f.queue.enqueue("extension_fill_result",{filledCount:i})));
  await Promise.all([f.queue.flush(),f.queue.flush()]);
  expect(f.send).toHaveBeenCalledTimes(10);
  expect(f.values.telemetryOutboxV1).toEqual([]);
});

it("does not send another account's queue or resurrect it after disconnect", async () => {
  const f=fixture(); await f.queue.enqueue("extension_fill_result");
  f.values.accessToken="token-2";
  await f.queue.flush();
  expect(f.send).not.toHaveBeenCalled();
  await f.queue.enqueue("extension_fill_start");
  let done!: (status:number)=>void;
  f.send.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;}));
  const flushing=f.queue.flush();
  await vi.waitFor(()=>expect(f.send).toHaveBeenCalledOnce());
  await f.queue.clear();
  delete f.values.accessToken;
  done(503); await flushing;
  expect(f.values.telemetryOutboxV1).toBeUndefined();
});

it("bounds queue size and retention, and drops permanent bad requests", async () => {
  const f=fixture();
  await Promise.all(Array.from({length:105},()=>f.queue.enqueue("extension_fill_result")));
  expect(f.values.telemetryOutboxV1).toHaveLength(100);
  expect(f.values.telemetryLastDropAt).toBeTypeOf("number");
  f.send.mockResolvedValue(400);
  await f.queue.flush();
  expect(f.values.telemetryOutboxV1).toHaveLength(90);
  f.advance(8*86400_000);
  await f.queue.flush();
  expect(f.values.telemetryOutboxV1).toEqual([]);
});
