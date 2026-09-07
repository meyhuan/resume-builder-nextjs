import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Only an explicitly named test DB and local server; no real login/session is read.
const expectedHost=process.argv[2];
assert.ok(expectedHost,'必须显式传入测试数据库主机');
assert.equal(new URL(process.env.DATABASE_URL).hostname,expectedHost,'数据库主机与测试目标不一致');
const base='http://localhost:3000';
const redirectUri='https://eokmcmmadffnejmkmpfgipahenelpmbl.chromiumapp.org/oauth2';
const hash=value=>createHash('sha256').update(value).digest('hex');
const verifier=randomBytes(32).toString('base64url');
const challenge=createHash('sha256').update(verifier).digest('base64url');
const userId=`extension-auth-smoke-${randomUUID()}`;
const prisma=new PrismaClient();
let created=false;
async function issue(expired=false) {
  const code=randomBytes(32).toString('base64url');
  await prisma.extensionAuthCode.create({data:{userId,codeHash:hash(code),codeChallenge:challenge,redirectUri,expiresAt:new Date(Date.now()+(expired?-60000:600000))}});
  return code;
}
const exchange=(code,codeVerifier=verifier)=>fetch(`${base}/next-api/extension/token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,codeVerifier,redirectUri,deviceName:'Synthetic release QA'}),signal:AbortSignal.timeout(30000)});
try {
  const query=new URLSearchParams({redirect_uri:redirectUri,state:randomBytes(32).toString('base64url'),code_challenge:challenge});
  const anonymous=await fetch(`${base}/next-api/extension/silent-authorize?${query}`,{redirect:'manual',signal:AbortSignal.timeout(12000)});
  assert.ok([302,307].includes(anonymous.status),'本地生产构建的静默授权接口不可用');
  assert.equal(new URL(anonymous.headers.get('location')).searchParams.get('error'),'login_required');
  await prisma.user.create({data:{id:userId,name:'Extension synthetic auth QA'}});created=true;
  const code=await issue();
  const concurrent=await Promise.all([exchange(code),exchange(code)]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400],'并发兑换必须仅成功一次');
  const success=await concurrent.find(r=>r.status===200).json();
  assert.ok(success.accessToken);
  const stored=await prisma.extensionAuthorization.findMany({where:{userId}});
  assert.equal(stored.length,1);
  assert.equal(stored[0].tokenHash,hash(success.accessToken));
  assert.notEqual(stored[0].tokenHash,success.accessToken);
  assert.equal((await exchange(code)).status,400,'授权码重放未被拒绝');
  console.log('PASS: local production silent-auth rejects anonymous session; concurrent token exchange creates exactly one hashed authorization; replay rejected');

  const wrongPkce=await issue();
  assert.equal((await exchange(wrongPkce,randomBytes(32).toString('base64url'))).status,400);
  assert.equal((await prisma.extensionAuthCode.findUnique({where:{codeHash:hash(wrongPkce)}})).usedAt,null,'错误PKCE不应消耗合法授权码');
  assert.equal((await exchange(await issue(true))).status,400);
  assert.equal(await prisma.extensionAuthorization.count({where:{userId}}),1);
  console.log('PASS: incorrect PKCE and expired codes rejected without creating authorizations');

  const read=()=>fetch(`${base}/next-api/extension/profile`,{headers:{Authorization:`Bearer ${success.accessToken}`},signal:AbortSignal.timeout(30000)});
  // Only validate denied reads: no profile rows, including real profiles, are loaded.
  await prisma.extensionAuthorization.updateMany({where:{userId},data:{expiresAt:new Date(Date.now()-60000)}});
  assert.equal((await read()).status,401,'过期授权仍能读取资料');
  await prisma.extensionAuthorization.updateMany({where:{userId},data:{expiresAt:new Date(Date.now()+600000),revokedAt:new Date()}});
  assert.equal((await read()).status,401,'撤销授权仍能读取资料');
  console.log('PASS: expired and revoked tokens denied by real profile HTTP endpoint');
} finally {
  if(created) {
    assert.ok(userId.startsWith('extension-auth-smoke-'));
    await prisma.user.delete({where:{id:userId}});
    console.log('CLEANUP: removed only this run\'s synthetic account, codes and authorizations');
  }
  await prisma.$disconnect();
}
