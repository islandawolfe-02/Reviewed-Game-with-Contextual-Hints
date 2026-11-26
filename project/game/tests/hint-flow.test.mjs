// Own integration tests: supplied browser client -> real local host (HTTP) -> handler -> validator ->
// event -> P3 presentation. Expected values come from board facts and the W3.10 acceptance examples A1-A7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHost } from '../dist/server.js';
import { modeClient } from '../dist/scenarios.js';
import { fixedClient, hangingClient } from '../dist/clients.js';
import { evaluate, initialState, REFERENCE_BOARD as board } from '../dist/rules.js';
import { adviceView } from '../dist/presentation.js';
import { askForHint } from '../browser/client.mjs';

const S0 = initialState();
const S3 = { position: { x: 2, y: 1 }, movesRemaining: 3, score: 10, collected: ['t1'], status: 'playing' };
const SW = { position: { x: 2, y: 2 }, movesRemaining: 2, score: 10, collected: ['t1'], status: 'won' };

// Starts the supplied host on a free port with one controlled client, runs fn, then closes it.
async function withHost(client, fn, timeoutMs) {
  const events = [];
  const host = createHost({ clientFor: () => ({ client, timeoutMs }), emit: (e) => events.push(e) });
  await new Promise((resolve) => host.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${host.address().port}`;
  try {
    return await fn({ baseUrl, events });
  } finally {
    await new Promise((resolve) => host.close(resolve));
  }
}

// Asks for a hint the way onHint does and checks that the posted snapshot is unchanged afterwards.
async function ask(baseUrl, state, stateVersion = 0) {
  const body = { boardId: 'reference', state: structuredClone(state), stateVersion };
  const before = structuredClone(body);
  const envelope = await askForHint(body, { baseUrl });
  assert.deepEqual(body, before, 'requesting advice never changes the state');
  return envelope;
}
const eventFor = (events, envelope) => {
  const matching = events.filter((e) => e.requestId === envelope.requestId);
  assert.equal(matching.length, 1, 'exactly one terminal event per request ID');
  return matching[0];
};

test('A1 permitted response: success mode at the start offers east from the model', async () => {
  await withHost(modeClient('success'), async ({ baseUrl, events }) => {
    const envelope = await ask(baseUrl, S0);
    assert.match(envelope.requestId, /^hint-[0-9a-f]{8}$/);
    assert.deepEqual(envelope.hint, { action: { type: 'move', direction: 'east' }, explanation: 'Explore the open eastern square.' });
    assert.equal(envelope.source, 'model');
    const event = eventFor(events, envelope);
    assert.deepEqual(Object.keys(event), ['requestId', 'latencyMs', 'outcome', 'fallback'], 'only the four event fields');
    assert.deepEqual([event.outcome, event.fallback], ['model-success', false]);
    const view = adviceView(board, S0, envelope, 0, 0);
    assert.equal(view.why, 'Permitted: east is an allowed move from (0,0) (east, south).');
  });
});

test('A1 near goal: success mode at (2,1) holding t1 offers south (the exit)', async () => {
  await withHost(modeClient('success'), async ({ baseUrl }) => {
    const envelope = await ask(baseUrl, S3);
    assert.equal(envelope.source, 'model');
    assert.equal(envelope.hint.action.direction, 'south');
  });
});

test('A2 valid-shaped illegal action: north at the start is replaced by the east fallback', async () => {
  const client = modeClient('validation');
  await withHost(client, async ({ baseUrl, events }) => {
    const envelope = await ask(baseUrl, S0);
    assert.equal(client.calls.length, 1);
    assert.deepEqual(envelope.hint, { action: { type: 'move', direction: 'east' }, explanation: 'A permitted next move.' });
    assert.equal(envelope.source, 'fallback');
    const event = eventFor(events, envelope);
    assert.equal(event.outcome, 'validation-failure');
    assert.equal(event.fallback, true);
    // The rejected direction is never offered (the fallback-rule sentence names the N/E/S/W order, so check the offer itself).
    const view = adviceView(board, S0, envelope, 0, 0);
    assert.equal(view.advice, `Suggested: east - A permitted next move. (source: fallback, request ID: ${envelope.requestId})`);
    assert.match(view.why, /^Permitted: east is an allowed move from \(0,0\) \(east, south\)\./);
  });
});

test('A3 timeout: a hanging client falls back to east and the event says timeout, not validation-failure', async () => {
  await withHost(hangingClient(), async ({ baseUrl, events }) => {
    const envelope = await ask(baseUrl, S0);
    assert.equal(envelope.source, 'fallback');
    assert.equal(envelope.hint.action.direction, 'east');
    assert.deepEqual([eventFor(events, envelope).outcome, eventFor(events, envelope).fallback], ['timeout', true]);
  }, 50);
});

test('A4 unavailable server: the client call rejects and the player can still move locally', async () => {
  let closedUrl;
  await withHost(modeClient('success'), async ({ baseUrl }) => { closedUrl = baseUrl; });
  await assert.rejects(askForHint({ boardId: 'reference', state: S0, stateVersion: 0 }, { baseUrl: closedUrl }));
  const result = evaluate(board, S0, { type: 'move', direction: 'east' });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.state.position, { x: 1, y: 0 });
  assert.equal(result.state.movesRemaining, 5);
});

test('A5 unchanged state after advice in every serve mode', async () => {
  for (const mode of ['success', 'validation', 'malformed', 'provider-failure', 'irrelevant']) {
    await withHost(modeClient(mode), async ({ baseUrl }) => {
      await ask(baseUrl, S0); // ask() asserts the snapshot is unchanged
      assert.deepEqual(S0, { position: { x: 0, y: 0 }, movesRemaining: 6, score: 0, collected: [], status: 'playing' }, mode);
    });
  }
});

test('A6 no permitted action: a won game gets a null hint, no client call, outcome no-action', async () => {
  const client = modeClient('success');
  await withHost(client, async ({ baseUrl, events }) => {
    const envelope = await ask(baseUrl, SW, 3);
    assert.equal(envelope.hint, null);
    assert.equal(client.calls.length, 0);
    assert.equal(eventFor(events, envelope).outcome, 'no-action');
    assert.equal(adviceView(board, SW, envelope, 3, 3).advice, `No permitted action. (source: fallback, request ID: ${envelope.requestId})`);
  });
});

test('A7 stale response: a move while waiting discards the old advice', async () => {
  await withHost(fixedClient({ action: { type: 'move', direction: 'east' }, explanation: 'East is open.' }, 50), async ({ baseUrl }) => {
    let state = S0;
    let stateVersion = 0;
    const saved = stateVersion;
    const pending = ask(baseUrl, state, saved);
    const moved = evaluate(board, state, { type: 'move', direction: 'south' }); // the player moves while waiting
    state = moved.state;
    stateVersion += 1;
    const envelope = await pending;
    assert.equal(envelope.source, 'model', 'the advice was valid for the old state');
    assert.deepEqual(adviceView(board, S0, envelope, saved, stateVersion), { advice: 'State changed while waiting; request fresh advice.', why: '' });
    assert.deepEqual(state.position, { x: 0, y: 1 }, 'only the player move changed the state');
  });
});
