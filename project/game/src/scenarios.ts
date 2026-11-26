// Supplied deterministic local modes and named scenarios. These are synthetic stubs, not provider
// measurements: "source: model" names the accepted adapter path, not a live model call.
import type { Direction, Hint, ModelClient, ModelRequest } from './contracts.js';
import { failingClient, hangingClient, textTransport, transportClient, wait, type RecordingClient } from './clients.js';

export const MODES = ['success', 'validation', 'timeout', 'malformed', 'provider-failure', 'irrelevant'] as const;
export type Mode = (typeof MODES)[number];

const ADJECTIVE: Record<Direction, string> = { north: 'northern', east: 'eastern', south: 'southern', west: 'western' };
const PREFERENCE: Direction[] = ['east', 'south', 'west', 'north'];
const ALL: Direction[] = ['north', 'east', 'south', 'west'];

// Selects from the permitted list it is given; it does not reason about the treasure map.
export function permittedChoice(request: ModelRequest): Direction {
  const allowed = request.allowedActions.map((a) => a.direction);
  return PREFERENCE.find((d) => allowed.includes(d)) ?? 'east';
}

// A well-shaped answer whose direction is outside the permitted list (north at the start).
export function illegalChoice(request: ModelRequest): Direction {
  const allowed = request.allowedActions.map((a) => a.direction);
  return ALL.find((d) => !allowed.includes(d)) ?? 'north';
}

function answering(pick: (request: ModelRequest) => Hint, waitMs = 0): RecordingClient {
  const calls: ModelRequest[] = [];
  const client: ModelClient = async (request, options) => {
    calls.push(structuredClone(request));
    await wait(waitMs, options?.signal);
    return pick(request);
  };
  return Object.assign(client, { calls });
}

export const successAnswer = (r: ModelRequest): Hint => {
  const direction = permittedChoice(r);
  return { action: { type: 'move', direction }, explanation: `Explore the open ${ADJECTIVE[direction]} square.` };
};
export const illegalAnswer = (r: ModelRequest): Hint => {
  const direction = illegalChoice(r);
  return { action: { type: 'move', direction }, explanation: `Head ${direction}; it looks promising.` };
};
export const irrelevantAnswer = (r: ModelRequest): Hint => (
  { action: { type: 'move', direction: permittedChoice(r) }, explanation: 'Bananas are yellow.' }
);

// W3.10 / P3 serve modes.
export function modeClient(mode: Mode, waitMs = 0): RecordingClient {
  switch (mode) {
    case 'success': return answering(successAnswer, waitMs);
    case 'validation': return answering(illegalAnswer, waitMs);
    case 'irrelevant': return answering(irrelevantAnswer, waitMs);
    case 'timeout': return hangingClient();
    case 'malformed': return transportClient(textTransport('{not json'));
    case 'provider-failure': return failingClient('controlled provider failure (simulated outage)');
  }
}

// W3.09 named scenarios: each has a response behaviour and its own configured deadline.
export interface Scenario { name: string; description: string; timeoutMs: number; answer: (r: ModelRequest) => Hint }
export const SCENARIOS: Record<string, Scenario> = {
  'valid-advice': { name: 'valid-advice', description: 'Permitted advice; reference 2000 ms deadline', timeoutMs: 2000, answer: successAnswer },
  'invalid-advice': { name: 'invalid-advice', description: 'Well-shaped advice outside the permitted list; 2000 ms deadline', timeoutMs: 2000, answer: illegalAnswer },
  'controlled-timeout': { name: 'controlled-timeout', description: 'Permitted advice behind a short 50 ms controlled deadline', timeoutMs: 50, answer: successAnswer },
  'seed-a': { name: 'seed-a', description: 'Seeded request A (synthetic)', timeoutMs: 10, answer: successAnswer },
  'seed-b': { name: 'seed-b', description: 'Seeded request B (synthetic)', timeoutMs: 2000, answer: illegalAnswer },
};
export const MAX_WAIT_MS = 1000;

export function scenarioClient(name: string, waitMs: number): { client: RecordingClient; timeoutMs: number } {
  const scenario = SCENARIOS[name];
  if (!scenario) throw new RangeError(`unknown scenario: ${name}`);
  if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > MAX_WAIT_MS) throw new RangeError('wait must be an integer from 0 to 1000 ms');
  return { client: answering(scenario.answer, waitMs), timeoutMs: scenario.timeoutMs };
}
