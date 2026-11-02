import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultResume } from '@/lib/default-resume';
import { interviewPrepInputSchema } from './interview-prep-schema';

const mocks = vi.hoisted(() => ({ generateText: vi.fn(), getModel: vi.fn(() => ({})) }));
vi.mock('ai', () => ({ generateText: mocks.generateText }));
vi.mock('@/lib/ai/provider', () => ({ getModel: mocks.getModel, getJsonProviderOptions: () => ({}) }));
import { generateInterviewPrep } from './interview-prep';

const params = { resumeData: createDefaultResume(), jobDescription: '', aiConfig: { provider: 'dashscope', model: '', apiKey: '', baseURL: '' } };
const greetings = [{ style: 'concise', text: '简洁' }, { style: 'polite', text: '礼貌' }, { style: 'highlight', text: '亮点' }];

beforeEach(() => { vi.clearAllMocks(); });

describe('interview prep generation parts', () => {
  it('defaults old requests to the complete pack', () => {
    expect(interviewPrepInputSchema.parse({ resumeData: params.resumeData }).part).toBe('full');
    expect(interviewPrepInputSchema.safeParse({ resumeData: params.resumeData, part: 'other' }).success).toBe(false);
  });
  it('generates only greetings with a short budget and no thinking', async () => {
    mocks.generateText.mockResolvedValue({ text: JSON.stringify({ greetings }) });
    const timing = vi.fn();
    const result = await generateInterviewPrep({ ...params, part: 'greetings', onTiming: timing });
    expect(result.greetings).toEqual(greetings);
    expect(result.questions).toEqual([]);
    expect(mocks.getModel).toHaveBeenCalledWith(params.aiConfig, undefined, 'disabled');
    expect(mocks.generateText.mock.calls[0][0]).toMatchObject({ maxOutputTokens: 600 });
    expect(timing.mock.calls.map(([stage]) => stage)).toEqual(['prepare', 'model', 'parse']);
  });
  it('rejects incomplete greetings so the quota guard can refund', async () => {
    mocks.generateText.mockResolvedValue({ text: JSON.stringify({ greetings: greetings.slice(0, 2) }) });
    await expect(generateInterviewPrep({ ...params, part: 'greetings' })).rejects.toThrow('Invalid greetings');
  });
  it.each([
    ['intro', { selfIntro30s: '短介绍', selfIntro2min: '长介绍' }],
    ['questions', { questions: [{ question: '介绍一下项目', category: 'project' }] }],
  ] as const)('generates %s separately', async (part, payload) => {
    mocks.generateText.mockResolvedValue({ text: JSON.stringify(payload) });
    const result = await generateInterviewPrep({ ...params, part });
    expect(result).toMatchObject(payload);
    expect(mocks.getModel).toHaveBeenCalledWith(params.aiConfig, undefined, part === 'intro' ? 'disabled' : 'low');
  });
  it('records model duration on failure', async () => {
    mocks.generateText.mockRejectedValue(new Error('failed'));
    const timing = vi.fn();
    await expect(generateInterviewPrep({ ...params, part: 'greetings', onTiming: timing })).rejects.toThrow();
    expect(timing.mock.calls.map(([stage]) => stage)).toEqual(['prepare', 'model']);
  });
});
