import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({findMany:vi.fn(),count:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{extensionTelemetryEvent:mocks}}));
import { POST } from "./route";
const request=(body:unknown)=>new Request("http://local/next-api/admin/extension-metrics",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("ADMIN_PASSWORD","synthetic-only");mocks.findMany.mockResolvedValue([]);mocks.count.mockResolvedValue(0);});
afterEach(()=>vi.unstubAllEnvs());
it("rejects malformed shapes without querying the database",async()=>{
  for (const body of [null,[],true,42,"text"]) expect((await POST(request(body))).status).toBe(400);
  expect((await POST(new Request("http://local",{method:"POST",body:"{"}))).status).toBe(400);
  expect((await POST(request({junk:"x".repeat(4097)}))).status).toBe(413);
  expect(mocks.findMany).not.toHaveBeenCalled();
});
it("requires configured matching admin credentials before querying",async()=>{
  for (const body of [{},{adminPassword:"wrong"},{adminPassword:123}]) expect((await POST(request(body))).status).toBe(403);
  vi.stubEnv("ADMIN_PASSWORD","");
  expect((await POST(request({adminPassword:""}))).status).toBe(403);
  expect(mocks.findMany).not.toHaveBeenCalled();
});
it("rejects invalid ranges rather than coercing booleans and arrays",async()=>{
  for(const days of [0,91,1.5,true,[],"7"]) expect((await POST(request({adminPassword:"synthetic-only",days}))).status).toBe(400);
  expect(mocks.findMany).not.toHaveBeenCalled();
});
it("returns bounded non-cacheable statistics and discloses truncation",async()=>{
  mocks.findMany.mockResolvedValue([{properties:{sourceDomain:"example.com",filledCount:2,failedCount:1,alreadyFilledCount:9,status:"partial"}}]);
  mocks.count.mockResolvedValue(10001);
  const response=await POST(request({adminPassword:"synthetic-only",days:7}));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({total:10001,sampled:1,truncated:true,rows:[{writableSuccessRate:2/3}]});
  expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({take:10000,select:{properties:true},where:expect.objectContaining({eventName:"extension_fill_result"})}));
});
it("reports database failures without leaking internal details",async()=>{
  mocks.findMany.mockRejectedValue(new Error("private database detail"));
  const response=await POST(request({adminPassword:"synthetic-only"}));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database detail");
});
