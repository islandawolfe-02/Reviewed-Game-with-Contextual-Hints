// Supplied local host: serves the browser page and POST /api/hint on one origin (no CORS needed).
// Usage (after tsc):  node dist/server.js --mode success [--port 4310] [--events-file run/events.jsonl]
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ModelClient } from './contracts.js';
import { BadRequest, handleHint } from './handler.js';
import type { Event as HintEvent } from './instrumentation.js'; // [instrumentation]
import { REFERENCE_BOARD } from './rules.js';
import { MODES, modeClient, type Mode } from './scenarios.js';

export const DEFAULT_PORT = 4310;
const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// Only these compiled modules are served to the browser (pure code, no server configuration).
const BROWSER_MODULES = new Set(['rules.js', 'presentation.js']);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };

export interface HostOptions {
  // Chooses the server-side model client for one parsed request body.
  clientFor: (body: unknown) => { client: ModelClient; timeoutMs?: number };
  emit?: (event: HintEvent) => void; // [instrumentation]
  root?: string;
}

function send(res: ServerResponse, status: number, body: string, type: string, requestId?: string) {
  const headers: Record<string, string> = { 'content-type': type, 'cache-control': 'no-store' };
  if (requestId) headers['x-request-id'] = requestId;
  res.writeHead(status, headers);
  res.end(body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 16_384) throw new BadRequest('body too large');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequest('body is not valid JSON');
  }
}

function serveStatic(res: ServerResponse, root: string, urlPath: string): void {
  const browserDir = join(root, 'browser');
  let file: string | undefined;
  if (urlPath === '/' || urlPath === '/index.html') file = join(browserDir, 'index.html');
  else if (urlPath.startsWith('/browser/')) {
    const candidate = join(root, normalize(urlPath));
    if (candidate.startsWith(browserDir + sep)) file = candidate; // no escaping the browser folder
  } else if (urlPath.startsWith('/dist/') && BROWSER_MODULES.has(urlPath.slice(6))) {
    // Compiled pure modules: dist/<name>.js, or supplied/<name>.mjs in the plain-JavaScript demo.
    const name = urlPath.slice(6);
    file = [join(root, 'dist', name), join(root, 'supplied', name.replace(/\.js$/, '.mjs'))].find((f) => existsSync(f));
  }
  if (!file || !existsSync(file)) {
    send(res, 404, JSON.stringify({ code: 'NOT_FOUND', message: 'Not found' }), 'application/json');
    return;
  }
  send(res, 200, readFileSync(file, 'utf8'), TYPES[extname(file)] ?? 'text/plain');
}

export function createHost(options: HostOptions): Server {
  const root = options.root ?? PROJECT_ROOT;
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, 'Healthy', 'text/plain');
      if (req.method === 'GET' && url.pathname === '/api/boards/reference') {
        return send(res, 200, JSON.stringify(REFERENCE_BOARD), 'application/json');
      }
      if (url.pathname === '/api/hint') {
        const requestId = `hint-${randomUUID().slice(0, 8)}`;
        if (req.method !== 'POST') return send(res, 405, JSON.stringify({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST', requestId }), 'application/json', requestId);
        try {
          const body = await readJson(req);
          const { client, timeoutMs } = options.clientFor(body);
          const envelope = await handleHint(body, { requestId, client, timeoutMs, emit: options.emit }); // [instrumentation]
          return send(res, 200, JSON.stringify(envelope), 'application/json', requestId);
        } catch (error) {
          if (error instanceof BadRequest || error instanceof RangeError) {
            return send(res, 400, JSON.stringify({ code: 'INVALID_REQUEST', message: error.message, requestId }), 'application/json', requestId);
          }
          throw error;
        }
      }
      if (req.method === 'GET') return serveStatic(res, root, url.pathname);
      send(res, 404, JSON.stringify({ code: 'NOT_FOUND', message: 'Not found' }), 'application/json');
    } catch (error) {
      console.error('unexpected server error:', (error as Error).message);
      send(res, 500, JSON.stringify({ code: 'SERVER_ERROR', message: 'Unexpected error' }), 'application/json');
    }
  });
}

// Terminal event sink: one JSON line per completed hint request (local evidence, not Grafana).
export function eventSink(eventsFile?: string): (event: HintEvent) => void { // [instrumentation]
  return (event) => { // [instrumentation]
    const line = JSON.stringify(event); // [instrumentation]
    console.log(line); // [instrumentation]
    if (eventsFile) appendFileSync(eventsFile, `${line}\n`); // [instrumentation]
  }; // [instrumentation]
} // [instrumentation]

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = (arg('mode', process.env.MODE || 'success') ?? 'success') as Mode;
  if (!MODES.includes(mode)) {
    console.error(`unknown MODE "${mode}"; choose one of: ${MODES.join(', ')}`);
    process.exit(2);
  }
  const port = Number(arg('port', process.env.PORT ?? String(DEFAULT_PORT)));
  const host = createHost({ clientFor: () => ({ client: modeClient(mode) }), emit: eventSink(arg('events-file')) }); // [instrumentation]
  host.listen(port, '127.0.0.1', () => {
    console.log(`Hint host (mode: ${mode}) on http://127.0.0.1:${port}  -  Ctrl+C stops it.`);
    console.log('All responses are deterministic local stubs; no model provider is contacted.');
  });
}
