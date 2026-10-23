/** Shared by both OpenAI SDKs. Never switch providers after exposing output. */
export interface FailoverPolicy {
  firstOutputMs: number;
  completionMs: number;
  failureThreshold: number;
  cooldownMs: number;
}

export class ProviderCircuit {
  private failures = 0;
  private openUntil = 0;
  private probing = false;
  acquire(): boolean {
    if (!this.openUntil) return true;
    if (Date.now() < this.openUntil || this.probing) return false;
    this.probing = true;
    return true;
  }
  success() { this.failures = 0; this.openUntil = 0; this.probing = false; }
  failure(policy: FailoverPolicy) {
    if (++this.failures >= policy.failureThreshold || this.probing) {
      this.openUntil = Date.now() + policy.cooldownMs;
    }
    this.probing = false;
  }
  release() { this.probing = false; }
}

export const officialCircuit = new ProviderCircuit();

/** Short operational label. Never include prompts, credentials, or response bodies. */
export function failoverReason(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Official provider is not configured') return 'missing key';
  if (message === 'Provider deadline exceeded') return 'deadline';
  const status = /^Provider HTTP (\d+)$/.exec(message);
  if (status) return `HTTP ${status[1]}`;
  if (
    message === 'Provider stream error' ||
    message === 'Empty provider response' ||
    message === 'Stream ended without output' ||
    message === 'Excessive stream preamble'
  ) {
    return message;
  }
  return 'unavailable';
}

function warnFailover(reason: string) {
  console.warn(`[ai-provider] official unavailable before output; using bailian; reason=${reason}`);
}

class ProviderUnavailable extends Error {}
const retryable = (status: number) => [401, 402, 403, 408, 429].includes(status) || status >= 500;

// Heartbeats, role-only chunks and usage metadata do not count as generation.
function hasOutput(event: string): boolean {
  const data = event.split('\n').filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim()).join('\n');
  if (!data || data === '[DONE]') return false;
  const chunk = JSON.parse(data);
  if (chunk.error) throw new ProviderUnavailable('Provider stream error');
  return chunk.choices?.some((c: { delta?: { content?: string; reasoning_content?: string; tool_calls?: unknown[] } }) =>
    c.delta?.content || c.delta?.reasoning_content || c.delta?.tool_calls?.length);
}

async function readyResponse(
  invoke: (signal: AbortSignal) => Promise<Response>,
  streaming: boolean,
  signal: AbortSignal | undefined,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.throwIfAborted();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new ProviderUnavailable('Provider deadline exceeded')), timeout);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
  try {
    const response = await invoke(controller.signal);
    if (retryable(response.status)) {
      void response.body?.cancel();
      throw new ProviderUnavailable(`Provider HTTP ${response.status}`);
    }
    if (!response.ok) { cleanup(); return response; }
    if (!response.body) throw new ProviderUnavailable('Empty provider response');
    if (!streaming) {
      const body = await response.arrayBuffer();
      if (!body.byteLength) throw new ProviderUnavailable('Empty provider response');
      cleanup();
      return new Response(body, { status: response.status, headers: response.headers });
    }
    reader = response.body.getReader();
    const buffered: Uint8Array[] = [];
    const decoder = new TextDecoder();
    let pending = '', found = false, bytes = 0;
    while (!found) {
      const part = await reader.read();
      if (part.done) throw new ProviderUnavailable('Stream ended without output');
      buffered.push(part.value);
      bytes += part.value.length;
      if (bytes > 1024 * 1024) throw new ProviderUnavailable('Excessive stream preamble');
      pending += decoder.decode(part.value, { stream: true });
      pending = pending.replace(/\r\n/g, '\n');
      let end: number;
      while ((end = pending.indexOf('\n\n')) >= 0) {
        found = hasOutput(pending.slice(0, end)) || found;
        pending = pending.slice(end + 2);
      }
    }
    clearTimeout(timer);
    const activeReader = reader;
    return new Response(new ReadableStream<Uint8Array>({
      start(c) { for (const chunk of buffered) c.enqueue(chunk); },
      async pull(c) {
        try {
          const part = await activeReader.read();
          if (part.done) { cleanup(); c.close(); }
          else c.enqueue(part.value);
        } catch (error) { cleanup(); c.error(error); }
      },
      cancel(reason) { cleanup(); controller.abort(reason); return activeReader.cancel(reason); },
    }), { status: response.status, headers: response.headers });
  } catch (error) {
    cleanup();
    controller.abort();
    void reader?.cancel().catch(() => {});
    throw error;
  }
}

export async function fetchWithFailover(options: {
  primary: (signal: AbortSignal) => Promise<Response>;
  backup?: (signal: AbortSignal) => Promise<Response>;
  signal?: AbortSignal;
  streaming: boolean;
  policy: FailoverPolicy;
  circuit?: ProviderCircuit;
}): Promise<Response> {
  const { primary, backup, signal, streaming, policy, circuit = officialCircuit } = options;
  signal?.throwIfAborted();
  if (!backup) return primary(signal ?? new AbortController().signal);
  if (circuit.acquire()) {
    try {
      const response = await readyResponse(primary, streaming, signal,
        streaming ? policy.firstOutputMs : policy.completionMs);
      if (response.ok) circuit.success(); else circuit.release();
      return response;
    } catch (error) {
      if (signal?.aborted) { circuit.release(); throw error; }
      circuit.failure(policy);
      warnFailover(failoverReason(error));
    }
  } else {
    warnFailover('circuit open');
  }
  signal?.throwIfAborted();
  // One backup attempt; no recursively scheduled provider retries.
  return readyResponse(backup, streaming, signal, policy.completionMs);
}
