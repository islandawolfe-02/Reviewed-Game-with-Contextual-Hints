// Own unit tests for the P3 presentation boundary (src/presentation.ts).
// Expected text comes from board facts: start (0,0), wall (1,1), t1 at (2,0), exit (2,2), N/E/S/W order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviceView, allowedMovesText, STALE_TEXT } from '../dist/presentation.js';
import { initialState, REFERENCE_BOARD as board } from '../dist/rules.js';

const at = (x, y, movesRemaining, extra = {}) => ({
  position: { x, y }, movesRemaining, score: 0, collected: [], status: 'playing', ...extra,
});
const won = at(2, 2, 2, { score: 10, collected: ['t1'], status: 'won' });
const envelope = (direction, explanation, source = 'model', requestId = 'hint-test') => ({
  hint: { action: { type: 'move', direction }, explanation }, source, requestId,
});

// allowedMovesText
test('normal: at the start, north and west leave the board, so east and south are allowed', () => {
  assert.equal(allowedMovesText(board, initialState()), 'Allowed moves from (0,0): east, south.');
});
test('normal: at (1,0) beside the wall, north is the edge and south is the wall', () => {
  assert.equal(allowedMovesText(board, at(1, 0, 5)), 'Allowed moves from (1,0): east, west.');
});
test('boundary: a won game has no allowed moves', () => {
  assert.equal(allowedMovesText(board, won), 'Allowed moves from (2,2): none (status: won).');
});
test('boundary: a lost game on an open square still has no allowed moves', () => {
  assert.equal(allowedMovesText(board, at(0, 1, 0, { status: 'lost' })), 'Allowed moves from (0,1): none (status: lost).');
});

// adviceView
test('normal: model advice east at the start is shown with why it is permitted', () => {
  const view = adviceView(board, initialState(), envelope('east', 'Explore the open eastern square.'), 0, 0);
  assert.deepEqual(view, {
    advice: 'Suggested: east - Explore the open eastern square. (source: model, request ID: hint-test)',
    why: 'Permitted: east is an allowed move from (0,0) (east, south).',
  });
});
test('normal: fallback north at (2,1) names the deterministic fallback rule', () => {
  const view = adviceView(board, at(2, 1, 3, { score: 10, collected: ['t1'] }), envelope('north', 'A permitted next move.', 'fallback'), 4, 4);
  assert.equal(view.advice, 'Suggested: north - A permitted next move. (source: fallback, request ID: hint-test)');
  assert.equal(view.why, 'Permitted: north is an allowed move from (2,1) (north, south). Fallback rule: the first allowed move in north, east, south, west order.');
});
test('boundary: a null hint for a won game says nothing is permitted', () => {
  const view = adviceView(board, won, { hint: null, source: 'fallback', requestId: 'hint-won' }, 7, 7);
  assert.deepEqual(view, {
    advice: 'No permitted action. (source: fallback, request ID: hint-won)',
    why: 'Nothing to suggest: Allowed moves from (2,2): none (status: won).',
  });
});
test('boundary: a changed state version discards even valid advice', () => {
  const view = adviceView(board, initialState(), envelope('east', 'Explore the open eastern square.'), 0, 1);
  assert.deepEqual(view, { advice: STALE_TEXT, why: '' });
  assert.equal(STALE_TEXT, 'State changed while waiting; request fresh advice.');
});
test('boundary: a direction outside the allowed moves is never called permitted', () => {
  const view = adviceView(board, initialState(), envelope('north', 'Head north; it looks promising.'), 0, 0);
  assert.equal(view.why, 'Not permitted: north is not an allowed move from (0,0) (east, south).');
});
test('inputs are not mutated', () => {
  const state = initialState();
  const env = envelope('east', 'Explore the open eastern square.');
  const before = structuredClone({ board, state, env });
  allowedMovesText(board, state);
  adviceView(board, state, env, 0, 0);
  assert.deepEqual({ board, state, env }, before);
});
