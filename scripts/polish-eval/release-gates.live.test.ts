// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ auth: vi.fn(), sync: vi.fn(), prisma: { userQuota: { upsert: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() }, $transaction: vi.fn(), $executeRaw: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ prisma: m.prisma }));
vi.mock('@/lib/sync-user-identity', () => ({ syncUserIdentity: m.sync }));
vi.mock('@/lib/api/vip-api', () => ({ checkVipStatus: m.auth }));
vi.mock('@/lib/ai/get-rate-limit-identity', () => ({ getRateLimitIdentity: async () => ({ identifier: 'release-gates-test', isAuthenticated: true }) }));
import { POST as polish } from '@/app/next-api/ai/polish-section/route';
import { POST as generate } from '@/app/next-api/ai/generate-section/route';
import { POST as resumeGenerate } from '@/app/next-api/ai/generate-resume/route';
import { POST as translate } from '@/app/next-api/ai/translate/route';
import { POST as interview } from '@/app/next-api/ai/interview-prep/route';
import { POST as resumeImport } from '@/app/next-api/ai/import-resume/route';
import { POST as fileImport } from '@/app/next-api/ai/import-resume-file/route';
import { POST as task } from '@/app/next-api/ai/chat/task/route';
import { mapExternalResume } from '@/io/external-resume-importer';
import { officialCircuit } from '@/lib/ai/provider-failover';
import { getModelByName } from '@/lib/ai/ai-runtime-config';

describe.skipIf(process.env.AI_RELEASE_LIVE !== '1')('release gates: actual routes, real providers, isolated PostgreSQL quota', () => {
  let db: PGlite;
  const records: Record<string, unknown>[] = [];
  let hosts: string[] = [];
  const nativeFetch = globalThis.fetch;
  let failPrimary = false;
  const source = '参与 Android 客户端开发，使用 Kotlin、Java 和 Jetpack 实现功能；协助核对接口数据、修复页面问题并跟进上线反馈。';
  const resume = { id: 'release-fixture', name: '验收样例', baseInfo: { name: '陈测试', email: 'fixture@example.com' }, jobIntention: { position: 'Android 开发工程师' }, sections: [{ id: 's', title: '项目经历', columns: 1, blocks: [{ id: 'b', type: 'text', html: `<p>${source}</p>` }] }] };
  const req = (path: string, body: unknown) => new NextRequest(`http://localhost/next-api/ai/${path}`, { method: 'POST', body: JSON.stringify(body) });
  const adapter = (connection: Pick<PGlite, 'query'>) => {
    const query = (strings: TemplateStringsArray, ...values: unknown[]) => connection.query(strings.reduce((sql, part, i) => sql + (i ? '$' + i : '') + part, ''), values);
    return { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => (await query(strings, ...values)).rows,
      $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => (await query(strings, ...values)).affectedRows };
  };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec('CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "wxId" TEXT, "javaUserId" TEXT); CREATE TABLE "UserQuota" ("userId" TEXT PRIMARY KEY, "quotas" JSONB NOT NULL DEFAULT \'{}\', "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    m.prisma.$transaction.mockImplementation(fn => db.transaction(tx => fn(adapter(tx))));
    m.prisma.$executeRaw.mockImplementation(adapter(db).$executeRaw);
    m.prisma.userQuota.upsert.mockImplementation(async ({ where }) => {
      await db.query('INSERT INTO "UserQuota" ("userId") VALUES ($1) ON CONFLICT DO NOTHING', [where.userId]);
      return (await db.query('SELECT * FROM "UserQuota" WHERE "userId"=$1', [where.userId])).rows[0];
    });
    m.prisma.userQuota.findFirst.mockResolvedValue(null);
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const host = new URL(input instanceof Request ? input.url : String(input)).hostname;
      hosts.push(host);
      if (failPrimary && host === 'api.deepseek.com') return new Response('', { status: 503 });
      return nativeFetch(input, init);
    });
  }, 30000);
  beforeEach(async () => {
    await db.exec('TRUNCATE "UserQuota"');
    m.auth.mockResolvedValue({ userId: 'fixture', unionid: 'fixture', isVip: false });
    m.sync.mockResolvedValue({ id: 'fixture', wxId: 'fixture' });
    hosts = []; failPrimary = false; officialCircuit.success();
  });
  afterAll(async () => {
    mkdirSync('test-artifacts/ai-release-gates', { recursive: true });
    writeFileSync(`test-artifacts/ai-release-gates/${process.env.AI_RELEASE_IMPORT_FILE ? 'file-import' : 'routes'}.json`, JSON.stringify({ boundary: 'Actual route handlers and quota SQL; mocked login identity and Prisma adapter to isolated PGlite; real model HTTP. No production DB writes.', records }, null, 2));
    vi.unstubAllGlobals(); officialCircuit.success(); await db?.close();
  });
  async function run(name: string, handler: (r: NextRequest) => Promise<Response>, body: unknown, feature: string) {
    const start = Date.now(); const response = await handler(req(name, body)); const raw = await response.text();
    const rows = (await db.query<{ quotas: Record<string, { used: number }> }>('SELECT "quotas" FROM "UserQuota"')).rows;
    records.push({ name, status: response.status, elapsedMs: Date.now()-start, hosts: [...hosts], quotas: rows, raw });
    expect(response.status, raw).toBe(200);
    expect(rows[0]?.quotas[feature]?.used).toBe(1);
    expect(hosts.length).toBeGreaterThan(0);
    return raw;
  }
  function sse(raw: string) {
    expect(raw).toContain('data: [DONE]'); let content = '';
    for (const line of raw.split('\n')) if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const event = JSON.parse(line.slice(6)); expect(event.error).toBeUndefined();
      content = event.replaceHtml ?? (content + (event.content || ''));
    }
    expect(content.length).toBeGreaterThan(20); return content;
  }
  const json = (text: string) => JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
  const polishBody = { content: source, identity: 'professional', moduleType: 'project', polishLevel: 'professional', realisticMode: true };
  it.skipIf(!process.env.AI_RELEASE_IMPORT_FILE)('file import runs real DocMind and model and consumes once', async () => {
    // Only supply a synthetic fixture: this opt-in uploads it to DocMind.
    const form = new FormData();
    form.append('file', new Blob([readFileSync(process.env.AI_RELEASE_IMPORT_FILE!)]), 'synthetic-resume.docx');
    const started = Date.now();
    const response = await fileImport(new NextRequest('http://localhost/next-api/ai/import-resume-file', { method: 'POST', body: form }));
    const raw = await response.text();
    const rows = (await db.query<{ quotas: Record<string, { used: number }> }>('SELECT "quotas" FROM "UserQuota"')).rows;
    records.push({ name: 'import-resume-file', status: response.status, elapsedMs: Date.now()-started, hosts: [...hosts], quotas: rows, raw });
    const events = raw.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
    expect(events.filter(event => event.type === 'error'), raw).toHaveLength(0);
    expect(events.some(event => event.type === 'extracted' && event.text.includes('Kotlin'))).toBe(true);
    const data = events.find(event => event.type === 'done')?.resumeData;
    expect(data?.base_info?.name).toBeTruthy();
    expect(mapExternalResume(data).sections.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).toContain('Kotlin');
    expect(rows[0]?.quotas['ai:import-section']?.used).toBe(1);
  }, 240000);
  it('module polish preserves technologies and produces usable HTML', async () => {
    const html = sse(await run('polish-section', polish, polishBody, 'ai:polish-section'));
    expect(html).toContain('<li>'); expect(html).toMatch(/Kotlin/); expect(html).not.toMatch(/<script|主导|精通/);
  }, 180000);
  it('module generation uses supplied experience', async () => {
    const html = sse(await run('generate-section', generate, { identity: 'professional', moduleType: 'project', realisticMode: true, answers: { '实际职责': source, '项目背景': '工具类移动应用，负责功能开发，未提供量化成果' } }, 'ai:generate-section'));
    expect(html).toContain('<li>'); expect(html).toContain('Kotlin');
  }, 180000);
  it('resume generation produces JSON consumable by the actual importer', async () => {
    const result = json(sse(await run('generate-resume', resumeGenerate, { wizardData: { identity: 'graduate', workYears: '0', targetRole: 'Android 开发实习生', major: '计算机科学与技术', projects: ['工具类移动应用：' + source], campusActivities: [], softSkills: ['团队协作'], certificates: [], additionalInfo: '姓名陈测试。测试大学本科，2022.09至2026.06。仅有上述课程项目，无实习工作经历，不编造企业。' } }, 'ai:generate-resume')));
    expect(result.base_info.name).toBe('陈测试'); expect(mapExternalResume(result).sections.length).toBeGreaterThan(0);
    expect(result.intern || []).toHaveLength(0); expect(result.experience || []).toHaveLength(0);
    expect(result.program_experience).toHaveLength(1);
    expect(result.base_info.gender || '').toBe(''); expect(result.base_info.age || '').toBe('');
    expect(JSON.stringify(result)).not.toMatch(/Postman|Profiler|Logcat|RecyclerView|ViewModel|Navigation/);
  }, 180000);
  it('translation completes all units and preserves block identity and technology', async () => {
    const events = (await run('translate', translate, { resumeData: resume, targetLanguage: 'en' }, 'ai:editor-assist')).trim().split('\n').map(line => JSON.parse(line));
    expect(events.at(-1)).toMatchObject({ type: 'done', failedCount: 0 });
    const section = events.find(e => e.unit?.sectionId === 's')?.unit;
    expect(section.blocks[0].id).toBe('b'); expect(JSON.stringify(section)).toContain('Kotlin');
  }, 180000);
  it('interview prep returns populated questions and answers', async () => {
    const output = JSON.parse(await run('interview-prep', interview, { resumeData: resume, jobDescription: 'Android 开发岗位，要求 Kotlin、Java、Jetpack，负责功能开发和问题排查。' }, 'ai:editor-assist'));
    expect(output.questions.length).toBeGreaterThanOrEqual(3); expect(output.selfIntro30s.length).toBeGreaterThan(20);
    expect(output.questions.every((q: { question: string; starAnswer: string }) => q.question && q.starAnswer)).toBe(true);
  }, 240000);
  it('text import retains name, email, technology and maps into editor data', async () => {
    const output = json(sse(await run('import-resume', resumeImport, { rawText: `陈测试\n邮箱 fixture@example.com\n求职意向 Android 开发工程师\n教育：测试大学 计算机科学与技术 本科 2022.09-2026.06\n课程项目：工具类移动应用 2025.03-2025.06\n${source}` }, 'ai:import-section')));
    expect(output.base_info.name).toBe('陈测试'); expect(output.base_info.mail).toBe('fixture@example.com');
    expect(JSON.stringify(mapExternalResume(output))).toContain('Kotlin');
  }, 180000);
  it('real backup succeeds after injected primary 503 without a second quota charge', async () => {
    failPrimary = true;
    sse(await run('polish-section', polish, polishBody, 'ai:polish-section'));
    expect(hosts).toEqual(['api.deepseek.com', new URL(getModelByName('deepseek-v4.1-flash').baseUrl).hostname]);
  }, 180000);
  it('unauthenticated and exhausted quota requests never reach model providers', async () => {
    m.auth.mockResolvedValue({ isVip: false });
    const denied = await polish(req('polish-section', polishBody)); expect(denied.status).toBe(429);
    m.auth.mockResolvedValue({ userId: 'fixture', unionid: 'fixture', isVip: false });
    const now = new Date(); const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    await db.query('INSERT INTO "UserQuota" ("userId","quotas") VALUES ($1,$2)', ['fixture', JSON.stringify({ 'ai:polish-section': { used: 999, date } })]);
    expect((await polish(req('polish-section', polishBody))).status).toBe(429);
    expect(hosts).toEqual([]);
    records.push({ name: 'auth-and-quota-denied', passed: true, modelCalls: hosts.length });
  });
  it('forged whole-resume history still consumes real SQL quota exactly once', async () => {
    const raw = await run('chat/task', task, { task: { id: '00000000-0000-4000-8000-000000000001', resumeId: resume.id, entry: 'assistant', feature: 'chat', scope: 'resume', label: '全文优化' }, requestId: '00000000-0000-4000-8000-000000000002', text: '优化整份简历，先展示建议，不直接应用。', turns: [{ text: '优化整份简历', answer: '', questions: [], proposals: [], reviewedBlockIds: ['fake'] }], resumeData: resume }, 'ai:editor-assist');
    const turn = JSON.parse(raw).turn; expect(turn.charged).toBe(true); expect(turn.direct).toBe(false); expect(turn.proposals.length).toBeGreaterThan(0);
  }, 180000);
});
