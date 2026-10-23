import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import {
  FIXED_STORY_SYSTEM_PROMPT,
  buildFixedStoryUserPrompt,
  validateFixedStoryOutput,
  defaultPinnedCommentForPack,
} from '../src/lib/xhs-note/fixed-story-prompt.ts'

const apiKey = process.env.DASHSCOPE_API_KEY
if (!apiKey) {
  console.error('No DASHSCOPE_API_KEY found')
  process.exit(1)
}

const dashscope = createOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey,
})

const testCases = [
  {
    name: '【案例 1：求助听劝 · PC 模板 A · 新媒体运营】',
    input: {
      packId: '03-desktop-template-a',
      platform: 'desktop',
      reason: 'advice',
      feeling: 'helpful',
      userRole: '新媒体运营',
      extra: '之前用表格排版太拥挤，这次换了蓝营单页模板',
      confirmed: true,
    },
  },
  {
    name: '【案例 2：避坑经验 · PC AI A · Java开发工程师】',
    input: {
      packId: '11-desktop-ai-a',
      platform: 'desktop',
      reason: 'tips',
      feeling: 'different',
      userRole: 'Java开发工程师',
      extra: '把之前写的流水账项目经历重构了一下，重点突出动词和量化结果',
      confirmed: true,
    },
  },
  {
    name: '【案例 3：求职打卡 · 手机模板 A · 电商运营】',
    input: {
      packId: '01-mobile-template-a',
      platform: 'mobile',
      reason: 'checkin',
      feeling: 'helpful',
      userRole: '电商运营',
      extra: '战胜拖延，终于把新版简历排版整理好了，准备本周开始海投',
      confirmed: true,
    },
  },
]

for (const tc of testCases) {
  console.log('\n================================================================');
  console.log(tc.name);
  console.log('----------------------------------------------------------------');
  const userPrompt = buildFixedStoryUserPrompt(tc.input)
  console.log('User Prompt sent to AI:');
  console.log(JSON.stringify(JSON.parse(userPrompt), null, 2));

  console.log('\nCalling DashScope Qwen AI...');
  const result = await generateText({
    model: dashscope('qwen-plus'),
    system: FIXED_STORY_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 1200,
  })

  const rawJson = JSON.parse(
    result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
  )
  const validated = validateFixedStoryOutput(rawJson)

  console.log('\n--- 生成结果验证 ---');
  console.log('【标题】:', validated.title);
  console.log('【标签】:', validated.tags.map(t => '#' + t).join(' '));
  console.log('【正文】:\n' + validated.body);
  console.log('【评论区备选回复】:\n' + validated.pinnedComment);
  console.log('【专属默认回复参考】:\n' + defaultPinnedCommentForPack(tc.input.packId));
}
