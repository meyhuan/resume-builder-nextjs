import { describe, expect, it } from 'vitest'
import {
  createMobileEditPath,
  createMobileToolPath,
  getSafeReturnPath,
  replaceResumeId,
} from './route'

describe('mobile platform route contract', () => {
  it('builds a tool route with source and return context', () => {
    expect(createMobileToolPath({
      resumeId: 'resume/1',
      tool: 'assistant',
      source: 'mini',
      returnTo: '/m/edit?id=resume%2F1',
    })).toBe('/m/edit/tools?id=resume%2F1&tool=assistant&source=mini&returnTo=%2Fm%2Fedit%3Fid%3Dresume%252F1')
  })

  it('keeps return paths internal', () => {
    expect(getSafeReturnPath('/m/edit?id=abc', '/m')).toBe('/m/edit?id=abc')
    expect(getSafeReturnPath('https://evil.example', '/m')).toBe('/m')
    expect(getSafeReturnPath('//evil.example', '/m')).toBe('/m')
  })

  it('replaces the resume id without losing other query values', () => {
    expect(replaceResumeId('/m/edit?source=translate&id=old#top', 'new')).toBe('/m/edit?source=translate&id=new#top')
    expect(createMobileEditPath('resume/1')).toBe('/m/edit?id=resume%2F1')
  })
})
