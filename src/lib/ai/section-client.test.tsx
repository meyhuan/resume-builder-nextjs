import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePolishSection } from './use-polish-section';
import { useGenerateSection } from './use-generate-section';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const params = {
  identity: 'student' as const,
  moduleType: 'experience' as const,
  content: '<p>原文</p>',
  polishLevel: 'professional' as const,
  answers: { task: '整理资料' },
  realisticMode: true,
};
const cases: Array<{
  name: string;
  url: string;
  hook: () => {
    run: (input: typeof params) => Promise<string | null>;
    streamedHtml: string;
    error: string | null;
    reset: () => void;
  };
}> = [
  {
    name: 'polish',
    url: '/next-api/ai/polish-section',
    hook: function usePolishTest() {
      const h = usePolishSection();
      return { ...h, run: h.polish };
    },
  },
  {
    name: 'generate',
    url: '/next-api/ai/generate-section',
    hook: function useGenerateTest() {
      const h = useGenerateSection();
      return { ...h, run: h.generate };
    },
  },
];
it.each(cases)(
  'keeps $name on its own API and accumulates the streaming result',
  async ({ hook, url }) => {
    const fetch = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"content":"<p>整理"}\n'),
              );
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"content":"资料</p>"}\ndata: [DONE]\n',
                ),
              );
              controller.close();
            },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(hook);
    let output: string | null = null;
    await act(async () => {
      output = await result.current.run(params);
    });
    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) }),
    );
    expect(output).toBe('<p>整理资料</p>');
    expect(result.current.streamedHtml).toBe(output);
    expect(result.current.error).toBeNull();
    act(() => result.current.reset());
    expect(result.current.streamedHtml).toBe('');
  },
);
it.each(cases)(
  'preserves $name quota errors without creating a result',
  async ({ hook }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: '今日额度已用完' }), {
            status: 403,
          }),
      ),
    );
    const { result } = renderHook(hook);
    await act(async () => {
      expect(await result.current.run(params)).toBeNull();
    });
    expect(result.current.error).toBe('今日额度已用完');
    expect(result.current.streamedHtml).toBe('');
  },
);
