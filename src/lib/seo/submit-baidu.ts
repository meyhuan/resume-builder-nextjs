const SITE_URL: string = 'https://aijianli.cn';
const BAIDU_PUSH_ENDPOINT: string = 'https://data.zz.baidu.com/urls';

type BaiduPushResult = {
  submitted: boolean;
  status: number | null;
  message: string;
};

function getBaiduPushToken(): string {
  const token: string | undefined = process.env.BAIDU_PUSH_TOKEN;
  if (!token) {
    throw new Error('Missing BAIDU_PUSH_TOKEN environment variable.');
  }
  return token;
}

function normalizeUrls(urls: ReadonlyArray<string>): string[] {
  return Array.from(new Set(urls.filter((url: string) => url.startsWith(SITE_URL))));
}

/**
 * Submits canonical site URLs to Baidu's normal indexing API.
 */
export async function submitBaiduUrls(urls: ReadonlyArray<string>): Promise<BaiduPushResult> {
  const normalizedUrls: string[] = normalizeUrls(urls);
  if (normalizedUrls.length === 0) {
    return {
      submitted: false,
      status: null,
      message: 'No eligible URLs to submit.',
    };
  }
  const token: string = getBaiduPushToken();
  const endpoint: string = `${BAIDU_PUSH_ENDPOINT}?site=${encodeURIComponent(SITE_URL)}&token=${encodeURIComponent(token)}`;
  const response: Response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: normalizedUrls.join('\n'),
  });
  return {
    submitted: response.ok,
    status: response.status,
    message: response.ok ? 'Baidu URL submission succeeded.' : await response.text(),
  };
}

