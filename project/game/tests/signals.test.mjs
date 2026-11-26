// Fixed signal checks: five checks of the terminal event (request id, latency, outcome, fallback).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleHint } from '../dist/handler.js';
import { initialState } from '../dist/rules.js';
import { failingClient, fixedClient, hangingClient } from '../dist/clients.js';

const move = (direction, explanation) => ({ action: { type: 'move', direction }, explanation });
// A supplied fake clock: each reading advances by a fixed step, so the interval is exact.
const steppingClock = (start, step) => { let t = start - step; return { now: () => (t += step) }; };

async function observe(id, client, { state = initialState(), clock, timeoutMs = 2000 } = {}) {
  const events = [];
  const envelope = await handleHint({ boardId: 'reference', state, stateVersion: 0 },
    { requestId: id, client, clock, timeoutMs, emit: (event) => events.push(event) });
  return { envelope, events };
}

test('signal: latency is finish minus start on the supplied clock', async () => {
  const { events } = await observe('request-S1', fixedClient(move('east', 'East is open.')), { clock: steppingClock(1000, 17) });
  assert.equal(events.length, 1, 'exactly one terminal event');
  assert.equal(events[0].latencyMs, 17, '1017 - 1000 milliseconds');
});

test('signal: a model-success event has exactly the four permitted fields', async () => {
  const { envelope, events } = await observe('request-S2', fixedClient(move('east', 'Explore the open eastern square.')), { clock: steppingClock(5, 3) });
  assert.equal(envelope.source, 'model');
  assert.deepEqual(events, [{ requestId: 'request-S2', latencyMs: 3, outcome: 'model-success', fallback: false }]);
  assert.ok(!JSON.stringify(events).includes('eastern'), 'no explanation text in telemetry');
});

test('signal: a timeout emits once with outcome timeout and fallback true', async () => {
  const { envelope, events } = await observe('request-S3', hangingClient(), { timeoutMs: 30 });
  assert.equal(envelope.source, 'fallback');
  assert.equal(events.length, 1);
  assert.equal(events[0].requestId, 'request-S3');
  assert.equal(events[0].outcome, 'timeout');
  assert.equal(events[0].fallback, true);
});

test('signal: validation failure and provider failure are distinct causes behind the same fallback', async () => {
  const rejected = await observe('request-S4a', fixedClient(move('north', 'Go north.')));
  const failed = await observe('request-S4b', failingClient());
  assert.deepEqual(rejected.envelope.hint, failed.envelope.hint, 'the player sees the same advice');
  assert.deepEqual(rejected.events.map((e) => [e.requestId, e.outcome, e.fallback]), [['request-S4a', 'validation-failure', true]]);
  assert.deepEqual(failed.events.map((e) => [e.requestId, e.outcome, e.fallback]), [['request-S4b', 'provider-failure', true]]);
});

test('signal: no-action completion emits exactly once without a client call', async () => {
  const client = fixedClient(move('east', 'Go east.'));
  const won = { position: { x: 2, y: 2 }, movesRemaining: 0, score: 10, collected: ['t1'], status: 'won' };
  const { envelope, events } = await observe('request-S5', client, { state: won });
  assert.equal(envelope.hint, null);
  assert.equal(client.calls.length, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, 'no-action');
  assert.equal(events[0].fallback, true);
});
