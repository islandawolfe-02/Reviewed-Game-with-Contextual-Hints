// Fixed evaluation set: 24 checks across the agreed case families H01-H06.
// Expectations come from the game contract and independent board facts, never from the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleHint } from '../dist/handler.js';
import { initialState } from '../dist/rules.js';
import { failingClient, fixedClient, hangingClient, textTransport, transportClient } from '../dist/clients.js';

const FALLBACK = 'A permitted next move.';
const at = (x, y, movesRemaining, extra = {}) => ({
  position: { x, y }, movesRemaining, score: 0, collected: [], status: 'playing', ...extra,
});
const move = (direction, explanation) => ({ action: { type: 'move', direction }, explanation });

// Runs one request through the real handler with a controlled client and checks the cross-cutting
// obligations: the current request id returns, and requesting advice leaves the posted state unchanged.
async function run(id, state, client, timeoutMs = 2000) {
  const body = { boardId: 'reference', state, stateVersion: 0 };
  const before = structuredClone(body);
  const envelope = await handleHint(body, { requestId: id, client, timeoutMs });
  assert.equal(envelope.requestId, id, 'request identity is preserved');
  assert.deepEqual(body, before, 'advice never changes the posted state');
  return envelope;
}
const expectFallback = (envelope, direction) => {
  assert.equal(envelope.source, 'fallback');
  assert.deepEqual(envelope.hint, move(direction, FALLBACK));
};

// H01 well-shaped permitted hint: accept model hint
test('H01 permitted east at the start is accepted from the model', async () => {
  const client = fixedClient(move('east', 'Explore the open eastern square.'));
  const envelope = await run('request-H01-east', initialState(), client);
  assert.equal(envelope.source, 'model');
  assert.deepEqual(envelope.hint, move('east', 'Explore the open eastern square.'));
  assert.equal(client.calls.length, 1, 'one client call');
});
test('H01 accepted explanation is returned without trimming', async () => {
  const envelope = await run('request-H01-text', initialState(), fixedClient(move('south', ' South is open. ')));
  assert.equal(envelope.source, 'model');
  assert.equal(envelope.hint.explanation, ' South is open. ');
});
test('H01 extra response fields are omitted from the public hint', async () => {
  const response = { ...move('east', 'East is open.'), confidence: 0.99, action: { type: 'move', direction: 'east', label: 'Go!' } };
  const envelope = await run('request-H01-extra', initialState(), fixedClient(response));
  assert.equal(envelope.source, 'model');
  assert.deepEqual(envelope.hint, move('east', 'East is open.'));
});
test('H01 an explanation of exactly 160 UTF-16 units is accepted', async () => {
  const envelope = await run('request-H01-160', initialState(), fixedClient(move('east', 'e'.repeat(160))));
  assert.equal(envelope.source, 'model');
  assert.equal(envelope.hint.explanation.length, 160);
});

// H02 well-shaped illegal direction: deterministic fallback
test('H02 west from the starting edge falls back to east', async () => {
  expectFallback(await run('request-H02-west', initialState(), fixedClient(move('west', 'Go west.'))), 'east');
});
test('H02 north from the starting edge falls back to east', async () => {
  expectFallback(await run('request-H02-north', initialState(), fixedClient(move('north', 'Go north.'))), 'east');
});
test('H02 south into the wall from (1,0) falls back to east', async () => {
  // From (1,0) north leaves the board and south enters the wall at (1,1): permitted east, west.
  expectFallback(await run('request-H02-wall', at(1, 0, 5), fixedClient(move('south', 'South looks open.'))), 'east');
});
test('H02 east from (2,1) falls back to north', async () => {
  // From (2,1) east leaves the board and west enters the wall: permitted north, south.
  expectFallback(await run('request-H02-edge', at(2, 1, 3), fixedClient(move('east', 'Keep going east.'))), 'north');
});

// H03 malformed or invalid response: deterministic fallback
test('H03 malformed JSON text falls back', async () => {
  const client = transportClient(textTransport('{not json'));
  const envelope = await run('request-H03-malformed', initialState(), client);
  expectFallback(envelope, 'east');
  assert.equal(client.calls.length, 1, 'one attempted client call');
});
test('H03 parsed null falls back', async () => {
  expectFallback(await run('request-H03-null', initialState(), transportClient(textTransport('null'))), 'east');
});
test('H03 parsed array falls back', async () => {
  expectFallback(await run('request-H03-array', initialState(), transportClient(textTransport('[]'))), 'east');
});
test('H03 a response without an action falls back', async () => {
  expectFallback(await run('request-H03-no-action', initialState(), fixedClient({ explanation: 'Go east.' })), 'east');
});
test('H03 an action whose type is not move falls back', async () => {
  const response = { action: { type: 'jump', direction: 'east' }, explanation: 'Jump east.' };
  expectFallback(await run('request-H03-type', initialState(), fixedClient(response)), 'east');
});
test('H03 an unknown direction value falls back', async () => {
  expectFallback(await run('request-H03-direction', initialState(), fixedClient(move('up', 'Go up.'))), 'east');
});
test('H03 a whitespace-only explanation falls back', async () => {
  expectFallback(await run('request-H03-blank', initialState(), fixedClient(move('east', '   '))), 'east');
});
test('H03 an explanation of 161 UTF-16 units falls back', async () => {
  expectFallback(await run('request-H03-161', initialState(), fixedClient(move('east', 'e'.repeat(161)))), 'east');
});

// H04 timeout or provider failure: deterministic fallback
test('H04 an abort-aware hanging client times out to fallback', async () => {
  const client = hangingClient();
  const envelope = await run('request-H04-timeout', initialState(), client, 50);
  expectFallback(envelope, 'east');
  assert.equal(client.calls.length, 1, 'one attempted client call');
});
test('H04 a provider failure falls back', async () => {
  expectFallback(await run('request-H04-provider', initialState(), failingClient()), 'east');
});
test('H04 an HTTP error status from the transport falls back', async () => {
  expectFallback(await run('request-H04-http', initialState(), transportClient(textTransport('{}', 503))), 'east');
});

// H05 no permitted action: null hint, zero client calls
test('H05 a won game returns a null hint without calling the client', async () => {
  const client = fixedClient(move('east', 'Go east.'));
  const envelope = await run('request-H05-won', at(2, 2, 2, { score: 10, collected: ['t1'], status: 'won' }), client);
  assert.equal(envelope.hint, null);
  assert.equal(client.calls.length, 0, 'zero client calls');
});
test('H05 a lost game returns a null hint without calling the client', async () => {
  const client = fixedClient(move('north', 'Go north.'));
  const envelope = await run('request-H05-lost', at(2, 1, 0, { score: 10, collected: ['t1'], status: 'lost' }), client);
  assert.equal(envelope.hint, null);
  assert.equal(client.calls.length, 0, 'zero client calls');
});
test('H05 the no-action envelope is labelled fallback', async () => {
  const envelope = await run('request-H05-source', at(2, 2, 0, { score: 10, collected: ['t1'], status: 'won' }), hangingClient());
  assert.deepEqual(envelope, { hint: null, source: 'fallback', requestId: 'request-H05-source' });
});

// H06 legal action, irrelevant explanation: runtime may accept; human review required
test('H06 legal east with an irrelevant explanation passes the runtime gates', async () => {
  const envelope = await run('request-H06-bananas', initialState(), fixedClient(move('east', 'Bananas are yellow.')));
  assert.equal(envelope.source, 'model', 'runtime accepts; the human review records the usefulness verdict');
  assert.deepEqual(envelope.hint, move('east', 'Bananas are yellow.'));
});
test('H06 the revised explanation passes the same runtime gates', async () => {
  const revised = 'Moving east approaches the treasure at (2, 0).';
  const envelope = await run('request-H06-revised', initialState(), fixedClient(move('east', revised)));
  assert.equal(envelope.source, 'model');
  assert.equal(envelope.hint.explanation, revised);
});
