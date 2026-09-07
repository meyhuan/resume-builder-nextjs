import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Run only against the explicitly named test database. Never inspect real profiles.
const expectedHost = process.argv[2];
assert.ok(expectedHost, '必须显式传入测试数据库主机');
assert.equal(new URL(process.env.DATABASE_URL).hostname, expectedHost, '数据库主机与测试目标不一致');
const base='http://localhost:3000';
const userId=`extension-release-smoke-${randomUUID()}`;
const token=randomBytes(48).toString('base64url');
const prisma=new PrismaClient();
let created=false;
try {
  await prisma.user.create({data:{id:userId,name:'Extension synthetic QA'}}); created=true;
  await prisma.extensionAuthorization.create({data:{userId,tokenHash:createHash('sha256').update(token).digest('hex'),scopes:['application-profile:read'],expiresAt:new Date(Date.now()+600000)}});
  const event={eventId:randomUUID(),eventName:'extension_fill_result',occurredAt:new Date().toISOString(),properties:{sourceDomain:'release-smoke.example',extensionVersion:'0.5.0',status:'partial',filledCount:2,failedCount:1,alreadyFilledCount:20,profileText:'MUST_NOT_BE_PERSISTED'}};
  const post=()=>fetch(`${base}/next-api/extension/analytics`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(event),signal:AbortSignal.timeout(30000)});
  const responses=await Promise.all([post(),post()]);
  assert.deepEqual(responses.map(response=>response.status),[204,204]);
  const rows=await prisma.extensionTelemetryEvent.findMany({where:{userId}});
  assert.equal(rows.length,1,'重试产生重复统计');
  assert.equal(rows[0].properties.filledCount,2);
  assert.equal(rows[0].properties.profileText,undefined,'统计泄漏正文');
  console.log('PASS: authenticated HTTP -> PostgreSQL receipt; concurrent retry deduplicated; private fields removed');
  assert.ok(process.env.ADMIN_PASSWORD,'需要本地管理员配置以验收统计查询');
  const report=await fetch(`${base}/next-api/admin/extension-metrics`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminPassword:process.env.ADMIN_PASSWORD,days:1}),signal:AbortSignal.timeout(30000)});
  assert.equal(report.status,200);
  const json=await report.json();
  const group=json.rows.find(row=>row.domain==='release-smoke.example' && row.version==='0.5.0');
  assert.ok(group?.runs>=1);
  assert.equal(group.writableSuccessRate,2/3);
  console.log('PASS: admin report reads durable events and excludes pre-existing values from write success rate');
  await prisma.extensionAuthorization.updateMany({where:{userId},data:{revokedAt:new Date()}});
  assert.equal((await post()).status,401);
  assert.equal(await prisma.extensionTelemetryEvent.count({where:{userId}}),1);
  console.log('PASS: revoked authorization rejected');
} finally {
  // Only the synthetic account created above and its cascading test rows.
  if (created) {
    assert.ok(userId.startsWith('extension-release-smoke-'));
    await prisma.user.delete({where:{id:userId}});
    console.log('CLEANUP: removed this run\'s synthetic account, authorization and telemetry');
  }
  await prisma.$disconnect();
}
