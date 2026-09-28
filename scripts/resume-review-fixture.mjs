// Synthetic screenshot fixture only. Never used by application/runtime code.
export function resumeReviewFixture(body) {
  const blocks = (body.resumeData?.sections || []).flatMap((section) => section.blocks.map((block) => ({ block, label: `${section.title} · ${block.company || block.organization || block.name || block.school || '正文'}` })));
  const content = (block) => block.contentHtml || block.html || block.courseHtml || (block.items || []).map((item) => item.html).join('');
  const proposals = blocks.filter(({ block }) => content(block)).slice(0, 3).map(({ block, label }) => ({ action: 'updateBlock', blockId: block.id, before: JSON.stringify(block), targetLabel: label, factChecked: true, html: content(block).replaceAll('，', '；') }));
  return { turn: { requestId: body.requestId, text: body.text, answer: '演示数据：请核对以下表达调整。', questions: [], proposals, scope: 'resume', coverage: blocks.map(({ block, label }) => ({ blockId: block.id, label, status: proposals.some((p) => p.blockId === block.id) ? 'proposed' : 'unchanged' })), followups: ['哪些表达还可以精简？', '哪些信息需要我确认？'], direct: false, charged: true, feature: 'chat' } };
}
export async function clickReviewButton(page, text) {
  await page.waitForFunction((label) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === label && !b.disabled), {}, text);
  await page.evaluate((label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label && !b.disabled).click(), text);
}
export async function openResumeReview(page) {
  await clickReviewButton(page, '简历检查');
  await page.waitForSelector('[role="dialog"]');
}
export async function generateResumeReview(page) {
  await clickReviewButton(page, '优化整份简历');
  await page.waitForFunction(() => document.body.innerText.includes('全选待处理建议'));
}
