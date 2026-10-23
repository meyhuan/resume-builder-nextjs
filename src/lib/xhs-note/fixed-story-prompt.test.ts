import { describe, expect, it } from 'vitest'
import {
  buildFixedStoryUserPrompt,
  validateFixedStoryOutput,
  redactContactInfo,
  DISCLAIMER_NOTE,
} from './fixed-story-prompt'

describe('fixed story prompt & validation', () => {
  const validOutput = {
    title: '换了个模板改简历，确实省心不少',
    body: '最近准备找工作，旧简历排版乱糟糟的。\n\n这次在电脑网页版用了智简简历，挑了一个清楚的单栏模板。模块之间顺畅了很多，省去了反复调边距的麻烦。\n\n不过模板只是外观，核心经历还是要自己一条条打磨。希望大家求职顺利！',
    tags: ['简历模板', '求职经验', '改简历'],
  }

  it('builds comprehensive user prompt with feature, feelings and pack titles', () => {
    const promptStr = buildFixedStoryUserPrompt({
      packId: '01-mobile-template-a',
      platform: 'mobile',
      reason: 'job',
      feeling: 'helpful',
      extra: '主要是重新排版了项目部分',
      confirmed: true,
      userRole: '前端开发',
    })
    const prompt = JSON.parse(promptStr)
    expect(prompt['实际使用端']).toContain('手机端')
    expect(prompt['求职目标或方向']).toContain('前端开发')
    expect(prompt['体验的核心功能']).toContain('选择简历模板')
    expect(prompt['用户自主补充细节']).toBe('主要是重新排版了项目部分')
    expect(prompt['所选配图主题与画面提示'].length).toBe(3)
  })

  it('validates correct AI output and provides clean body without forced disclaimer', () => {
    const validated = validateFixedStoryOutput(validOutput)
    expect(validated.title).toBe(validOutput.title)
    expect(validated.body).not.toContain(DISCLAIMER_NOTE)
    expect(validated.tags).toEqual(validOutput.tags)
    expect(validated.pinnedComment).toBeTruthy()
  })

  it('redacts sensitive contact info like phone, email and ID cards', () => {
    const textWithContacts = '我的联系方式是 13812345678，邮箱 test@example.com，身份证 110101199003072345。'
    const redacted = redactContactInfo(textWithContacts)
    expect(redacted).not.toContain('13812345678')
    expect(redacted).not.toContain('test@example.com')
    expect(redacted).not.toContain('110101199003072345')
    expect(redacted).toContain('[电话已隐藏]')
    expect(redacted).toContain('[邮箱已隐藏]')
    expect(redacted).toContain('[证件信息已隐藏]')
  })

  it('throws on invalid title or body length', () => {
    expect(() => validateFixedStoryOutput({ ...validOutput, title: '太短' })).toThrow('标题长度')
    expect(() => validateFixedStoryOutput({ ...validOutput, body: '正文太短了' })).toThrow('正文长度')
    expect(() => validateFixedStoryOutput({ ...validOutput, tags: ['仅一个'] })).toThrow('标签数量')
  })
})
