import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({auth:vi.fn(),createMany:vi.fn(),after:vi.fn(),forward:vi.fn(),findUser:vi.fn()}));
vi.mock("@/features/extension-auth/server",()=>({requireExtensionUser:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{extensionTelemetryEvent:{createMany:mocks.createMany},user:{findUnique:mocks.findUser}}}));
vi.mock("@/lib/server-analytics",()=>({trackServerAnalyticsEvent:mocks.forward}));
vi.mock("next/server",async original=>({...await original<object>(),after:mocks.after}));
import { POST } from "./route";
const event={eventId:"f3e0f276-8d8c-4c7b-a1dd-f60f2e37b328",eventName:"extension_fill_result",properties:{filledCount:3,status:"partial",resume:"private"}};
const request=(body:unknown=event)=>new Request("http://local/next-api/extension/analytics",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({userId:"user-one"});mocks.createMany.mockResolvedValue({count:1});});
afterEach(()=>vi.restoreAllMocks());
it("acknowledges only durable receipt and uses a stable scoped ID",async()=>{
  expect((await POST(request())).status).toBe(204);
  const args=mocks.createMany.mock.calls[0][0];
  expect(args).toMatchObject({skipDuplicates:true,data:[{id:`user-one:${event.eventId}`,properties:{filledCount:3,status:"partial"}}]});
  expect(JSON.stringify(args)).not.toContain("private");
  expect(mocks.after).toHaveBeenCalledOnce();
});
it("does not forward the same event twice",async()=>{
  mocks.createMany.mockResolvedValue({count:0});
  expect((await POST(request())).status).toBe(204);
  expect(mocks.after).not.toHaveBeenCalled();
});
it("returns retryable failure when persistence fails, not false 204",async()=>{
  vi.spyOn(console,"warn").mockImplementation(()=>{});
  mocks.createMany.mockRejectedValue(new Error("db down"));
  expect((await POST(request())).status).toBe(503);
  expect(mocks.after).not.toHaveBeenCalled();
});
it("rejects expired auth before touching telemetry storage",async()=>{
  mocks.auth.mockRejectedValue(new Error("EXTENSION_UNAUTHORIZED"));
  expect((await POST(request())).status).toBe(401);
  expect(mocks.createMany).not.toHaveBeenCalled();
});
it("rejects oversized, malformed and stale events",async()=>{
  expect((await POST(request({...event,junk:"a".repeat(17_000)}))).status).toBe(413);
  expect((await POST(request({...event,eventName:"other"}))).status).toBe(400);
  expect((await POST(request({...event,occurredAt:"2020-01-01T00:00:00.000Z"}))).status).toBe(400);
  expect(mocks.createMany).not.toHaveBeenCalled();
});
