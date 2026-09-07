import { afterEach, expect, it, vi } from "vitest";
import { apiRequest } from "./api-request";
afterEach(()=>vi.unstubAllGlobals());
it("adds a bounded request signal and returns HTTP failures for callers to classify",async()=>{
  const response=new Response("",{status:503}); const fetchMock=vi.fn(async()=>response);vi.stubGlobal("fetch",fetchMock);
  expect(await apiRequest("https://aijianli.cn/test")).toBe(response);
  expect(fetchMock).toHaveBeenCalledWith("https://aijianli.cn/test",expect.objectContaining({signal:expect.any(AbortSignal)}));
});
it("shows a Chinese timeout instead of leaking technical request details",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new DOMException("secret URL","TimeoutError")));
  await expect(apiRequest("https://aijianli.cn/test")).rejects.toThrow("连接智简简历超时");
});
