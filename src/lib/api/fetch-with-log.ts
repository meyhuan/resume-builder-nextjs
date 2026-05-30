/**
 * Fetch wrapper with built-in logging for server-side Java API calls.
 * Logs are only shown in development mode (NODE_ENV !== 'production').
 */

import { getServerJavaApiBaseUrl } from '@/lib/java-api-base';

const JAVA_API_BASE = getServerJavaApiBaseUrl();
const isDev = process.env.NODE_ENV !== 'production';

interface FetchWithLogOptions extends RequestInit {
  /** Log prefix for identifying the caller (e.g., '[vip/info]', '[quota]') */
  logPrefix: string;
  /** Whether to log the full response body (default: true for debug) */
  logResponseBody?: boolean;
}

/**
 * Fetch wrapper that logs requests and responses for debugging.
 * Automatically prepends JAVA_API_BASE if URL is relative.
 */
export async function fetchJavaWithLog(
  url: string,
  options: FetchWithLogOptions
): Promise<Response> {
  const { logPrefix, ...fetchOptions } = options;
  const fullUrl = url.startsWith('http') ? url : `${JAVA_API_BASE}${url}`;

  if (isDev) {
    console.log(`${logPrefix} → Java API: ${fetchOptions.method || 'GET'} ${fullUrl}`);
  }

  const startTime = Date.now();
  const response = await fetch(fullUrl, fetchOptions);
  const duration = Date.now() - startTime;

  if (isDev) {
    console.log(`${logPrefix} ← Java API: ${response.status} (${duration}ms)`);
  }

  return response;
}

/**
 * Parse JSON response with logging.
 * Logs the response body for debugging.
 */
export async function parseJsonWithLog<T>(
  response: Response,
  logPrefix: string
): Promise<T> {
  const data = await response.json();
  if (isDev) {
    console.log(`${logPrefix} ← Body:`, JSON.stringify(data).slice(0, 500));
  }
  return data as T;
}
