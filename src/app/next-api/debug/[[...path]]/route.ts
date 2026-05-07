import { NextResponse } from 'next/server';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

/**
 * GET /next-api/debug/find-by-openid/{openid}
 * GET /next-api/debug/find-by-id/{userId}
 *
 * Proxy to Java backend debug endpoints.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path ?? []).join('/');

  try {
    const response = await fetch(`${JAVA_API_BASE}/debug/${pathStr}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[debug] Error:', error);
    return NextResponse.json({ error: 'Backend error' }, { status: 500 });
  }
}

/**
 * POST /next-api/debug/reset-vip/{openid}
 * POST /next-api/debug/reset-vip-by-id/{userId}
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path ?? []).join('/');

  try {
    const response = await fetch(`${JAVA_API_BASE}/debug/${pathStr}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[debug] Error:', error);
    return NextResponse.json({ error: 'Backend error' }, { status: 500 });
  }
}
