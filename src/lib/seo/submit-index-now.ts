const SITE_URL: string = 'https://airesumepass.com';
const INDEX_NOW_ENDPOINT: string = 'https://api.indexnow.org/indexnow';

type IndexNowResult = {
  submitted: boolean;
  status: number | null;
  message: string;
};

function getIndexNowKey(): string {
  const key: string | undefined = process.env.INDEXNOW_KEY;
  if (!key) {
    throw new Error('Missing INDEXNOW_KEY environment variable.');
  }
  return key;
}

function getIndexNowKeyLocation(): string {
  const keyLocation: string | undefined = process.env.INDEXNOW_KEY_LOCATION;
  if (keyLocation) {
    return keyLocation;
  }
  return `${SITE_URL}/.well-known/indexnow.txt`;
}

function normalizeUrls(urls: ReadonlyArray<string>): string[] {
  return Array.from(new Set(urls.filter((url: string) => url.startsWith(SITE_URL))));
}

/**
 * Submits a batch of canonical site URLs to the IndexNow API.
 */
export async function submitIndexNowUrls(urls: ReadonlyArray<string>): Promise<IndexNowResult> {
  const normalizedUrls: string[] = normalizeUrls(urls);
  if (normalizedUrls.length === 0) {
    return {
      submitted: false,
      status: null,
      message: 'No eligible URLs to submit.',
    };
  }
  const key: string = getIndexNowKey();
  const keyLocation: string = getIndexNowKeyLocation();
  const response: Response = await fetch(INDEX_NOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      host: SITE_URL.replace('https://', ''),
      key,
      keyLocation,
      urlList: normalizedUrls,
    }),
  });
  return {
    submitted: response.ok,
    status: response.status,
    message: response.ok ? 'IndexNow submission succeeded.' : await response.text(),
  };
}
