import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDraft, validateOrigin, saveDraft } from './article-draft.mjs';

const article = { slug: 'unique-topic', title: '标题', summary: '摘要', content: '## 正文', category: 'career-guide', tags: [], status: 'DRAFT' };
const saved = { ...article, id: 'id', updatedAt: '2026-11-08T00:00:00.000Z' };
const receipt = { origin: 'https://aijianli.cn', article: saved };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function mockFetch(responses) {
  const calls = [];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    assert.ok(responses.length, 'unexpected network request');
    return responses.shift();
  } };
}

test('rejects publication, credential fields and invalid slugs', () => {
  for (const input of [{ ...article, status: 'PUBLISHED' }, { ...article, adminPassword: 'secret' }, { ...article, slug: '../other' }]) assert.throws(() => parseDraft(input));
});
test('limits credentials to official origin or loopback', () => {
  for (const url of ['https://evil.example', 'http://aijianli.cn', 'https://aijianli.cn.evil.example', 'https://user:secret@aijianli.cn', 'https://aijianli.cn/path']) assert.throws(() => validateOrigin(url));
  assert.equal(validateOrigin('http://localhost:3000'), 'http://localhost:3000');
});
test('saves only DRAFT and returns a credential-free review snapshot after readback', async () => {
  const mock = mockFetch([json({ articles: [] }), new Response('', { status: 404 }), json({ article: saved }), json({ articles: [saved] })]);
  const result = await saveDraft({ input: article, password: 'test-secret', ...mock });
  assert.equal(result.reviewState, 'AWAITING_USER_APPROVAL');
  assert.ok(!JSON.stringify(result).includes('test-secret'));
  const request = JSON.parse(mock.calls[2].options.body);
  assert.equal(request.article.status, 'DRAFT');
  assert.equal(mock.calls[2].options.redirect, 'error');
});
test('refuses to shadow a legacy public article', async () => {
  const mock = mockFetch([json({ articles: [] }), new Response('old article', { status: 200 })]);
  await assert.rejects(saveDraft({ input: article, password: 'test', ...mock }), /已公开存在/);
  assert.equal(mock.calls.length, 2);
});
test('refuses duplicate creation and refuses to unpublish a live article', async () => {
  for (const previous of [undefined, receipt]) {
    const mock = mockFetch([json({ articles: [{ ...saved, status: 'PUBLISHED' }] })]);
    await assert.rejects(saveDraft({ input: article, password: 'test', receipt: previous, ...mock }));
    assert.equal(mock.calls.length, 1);
  }
});
test('refuses stale receipt without writing', async () => {
  const mock = mockFetch([json({ articles: [{ ...saved, updatedAt: 'new-version' }] })]);
  await assert.rejects(saveDraft({ input: article, password: 'test', receipt, ...mock }), /版本已变化/);
  assert.equal(mock.calls.length, 1);
});
test('updates the approved draft ID with optimistic concurrency, then verifies content', async () => {
  const input = { ...article, content: '改稿' };
  const updated = { ...saved, ...input, updatedAt: '2026-11-08T00:01:00.000Z' };
  const mock = mockFetch([json({ articles: [saved] }), json({ article: updated }), json({ articles: [updated] })]);
  const result = await saveDraft({ input, password: 'test', receipt, ...mock });
  assert.equal(JSON.parse(mock.calls[1].options.body).updatedAt, saved.updatedAt);
  assert.equal(result.article.content, '改稿');
});
test('does not claim success when post-save verification differs', async () => {
  const mock = mockFetch([json({ articles: [saved] }), json({ article: saved }), json({ articles: [{ ...saved, content: 'different' }] })]);
  await assert.rejects(saveDraft({ input: article, password: 'test', receipt, ...mock }), /回读不一致/);
});
test('does not send network requests without credentials or retry failed writes', async () => {
  const empty = mockFetch([]);
  await assert.rejects(saveDraft({ input: article, ...empty }), /缺少/);
  assert.equal(empty.calls.length, 0);
  const mock = mockFetch([json({ articles: [saved] }), json({ error: 'private details' }, 409)]);
  await assert.rejects(saveDraft({ input: article, password: 'test', receipt, ...mock }), /HTTP 409/);
  assert.equal(mock.calls.length, 2);
});
