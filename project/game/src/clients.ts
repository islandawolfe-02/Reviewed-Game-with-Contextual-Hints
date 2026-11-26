// Supplied server-side model clients. No live provider is called anywhere in this course lab:
// every client here is a deterministic local stub or a controlled local transport.
import type { ClientOptions, Hint, ModelClient, ModelRequest } from './contracts.js';

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`model client did not settle within ${ms} ms`);
    this.name = 'TimeoutError';
  }
}
export class MalformedResponseError extends Error {
  constructor(detail: string) {
    super(`model response could not be parsed: ${detail}`);
    this.name = 'MalformedResponseError';
  }
}
export class ProviderError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'ProviderError';
  }
}

// A client that also records each payload it received (a copy), so tests can inspect it.
export type RecordingClient = ModelClient & { calls: ModelRequest[] };

function recording(body: (request: ModelRequest, options?: ClientOptions) => Promise<Hint>): RecordingClient {
  const calls: ModelRequest[] = [];
  const client = (request: ModelRequest, options?: ClientOptions) => {
    calls.push(structuredClone(request));
    return body(request, options);
  };
  return Object.assign(client, { calls });
}

// Wrap a client with a deadline. The client receives an AbortSignal that aborts at the deadline;
// the race also stops waiting for a client that ignores the signal. A timer does not cancel remote work.
export function withTimeout(client: ModelClient, ms: number): ModelClient {
  return async (request, options) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new TimeoutError(ms);
        controller.abort(error);
        reject(error);
      }, ms);
    });
    try {
      return await Promise.race([client(request, { ...options, signal: controller.signal }), deadline]);
    } finally {
      clearTimeout(timer);
    }
  };
}

// Abort-aware controlled wait: rejects when the signal aborts.
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new TimeoutError(ms));
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new TimeoutError(ms));
    }, { once: true });
  });
}

// Always resolves to one fixed (possibly invalid) response after an optional wait.
export function fixedClient(response: unknown, waitMs = 0): RecordingClient {
  return recording(async (_request, options) => {
    await wait(waitMs, options?.signal);
    return structuredClone(response) as Hint;
  });
}

// Never settles unless its abort signal fires (abort-aware hanging stub).
export function hangingClient(): RecordingClient {
  return recording((_request, options) => new Promise<Hint>((_, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new TimeoutError(0)), { once: true });
  }));
}

// The provider fails (for example, the service is unavailable).
export function failingClient(message = 'controlled provider failure'): RecordingClient {
  return recording(async () => {
    throw new ProviderError(message);
  });
}

// An HTTPS-shaped client that uses an injected transport instead of the network. The controlled
// transports below return local responses, so the configured URL is never contacted.
export interface TransportResponse { ok: boolean; status: number; json(): Promise<unknown> }
export type Transport = (url: string, init: { method: string; body: string; signal?: AbortSignal }) => Promise<TransportResponse>;

export function transportClient(transport: Transport, url = 'https://model.example.invalid/v1/hint'): RecordingClient {
  return recording(async (request, options) => {
    const response = await transport(url, { method: 'POST', body: JSON.stringify(request), signal: options?.signal });
    if (!response.ok) throw new ProviderError(`provider returned HTTP ${response.status}`);
    try {
      return (await response.json()) as Hint;
    } catch (error) {
      throw new MalformedResponseError((error as Error).message);
    }
  });
}

// Controlled transport returning literal response text (e.g. '{not json').
export function textTransport(text: string, status = 200): Transport {
  return async () => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(text) });
}
