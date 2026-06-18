import { NextResponse } from 'next/server';

function getIndexNowKey(): string {
  const key: string | undefined = process.env.INDEXNOW_KEY;
  return key ?? '';
}

export function GET(): NextResponse {
  const key: string = getIndexNowKey();
  if (!key) {
    return new NextResponse('INDEXNOW_KEY is not configured.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
