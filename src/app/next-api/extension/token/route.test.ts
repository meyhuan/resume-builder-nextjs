import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({find:vi.fn(),claim:vi.fn(),create:vi.fn(),transaction:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{extensionAuthCode:{findUnique:mock.find},$transaction:mock.transaction}}));
import { hashCredential, verifyPkce, isAllowedExtensionRedirect } from "@/features/extension-auth/server";
import { POST } from "./route";
const verifier="v".repeat(64);
const redirectUri=`https://${"a".repeat(32)}.chromiumapp.org/oauth2`;
const body={code:"c".repeat(43),codeVerifier:verifier,redirectUri};
function request(data:unknown=body){return new Request("http://local/token",{method:"POST",body:JSON.stringify(data)});}
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv("EXTENSION_ALLOWED_IDS","a".repeat(32));
  mock.find.mockResolvedValue({id:"code1",userId:"u",expiresAt:new Date(Date.now()+60000),usedAt:null,redirectUri,codeChallenge:Buffer.from(hashCredential(verifier),"hex").toString("base64url")});
  mock.claim.mockResolvedValue({count:1});
  mock.transaction.mockImplementation(async fn=>fn({extensionAuthCode:{updateMany:mock.claim},extensionAuthorization:{create:mock.create}}));
});
afterEach(()=>vi.unstubAllEnvs());
it("claims an auth code atomically before creating authorization",async()=>{
  const response=await POST(request());
  expect(response.status).toBe(200);
  expect(mock.claim).toHaveBeenCalledWith({where:{id:"code1",usedAt:null,expiresAt:{gt:expect.any(Date)}},data:{usedAt:expect.any(Date)}});
  expect(mock.create).toHaveBeenCalledOnce();
  const payload=await response.json();
  expect(mock.create.mock.calls[0][0].data.tokenHash).toBe(hashCredential(payload.accessToken));
});
it("rejects a concurrent reuse even if both requests initially read unused",async()=>{
  mock.claim.mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:0});
  const results=await Promise.all([POST(request()),POST(request())]);
  expect(results.map(r=>r.status).sort()).toEqual([200,400]);
  expect(mock.create).toHaveBeenCalledOnce();
});
it("rejects bad verifier, missing values and non-object requests",async()=>{
  expect((await POST(request({...body,codeVerifier:"x".repeat(64)}))).status).toBe(400);
  expect((await POST(request({}))).status).toBe(400);
  expect((await POST(request(null))).status).toBe(400);
  expect(mock.create).not.toHaveBeenCalled();
  expect(verifyPkce("wrong","wrong")).toBe(false);
});
it("pins the callback origin, path, port and production allowlist",()=>{
  vi.stubEnv("NODE_ENV","production");
  expect(isAllowedExtensionRedirect(redirectUri)).toBe(true);
  for (const url of [redirectUri+"?next=evil",redirectUri+"#code",redirectUri.replace("/oauth2","/other"),redirectUri.replace(".org/",".org:8443/"),redirectUri.replace("https://","https://user@"),redirectUri.replace("a".repeat(32),"b".repeat(32))]) expect(isAllowedExtensionRedirect(url)).toBe(false);
});
