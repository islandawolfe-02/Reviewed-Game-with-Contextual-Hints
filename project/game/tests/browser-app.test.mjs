import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { evaluate, initialState, REFERENCE_BOARD } from '../dist/rules.js';
import { adviceView, allowedMovesText } from '../dist/presentation.js';

// Run the actual page event handlers against a small DOM substitute, with a controlled hint response.
const source = readFileSync(new URL('../browser/app.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '');
const envelope = (direction) => ({
  hint: { action: { type: 'move', direction }, explanation: 'A permitted next move.' },
  source: 'model', requestId: 'hint-test',
});

function page(askForHint) {
  const element = () => ({
    textContent: '', innerHTML: '', disabled: false, listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
  });
  const elements = Object.fromEntries(['board', 'state', 'status', 'allowed', 'message', 'advice', 'why', 'hint', 'reset']
    .map((id) => [`#${id}`, element()]));
  const buttons = ['north', 'east', 'south', 'west'].map((direction) => ({ ...element(), dataset: { move: direction } }));
  runInNewContext(source, {
    document: {
      querySelector: (selector) => elements[selector] ?? null,
      querySelectorAll: () => buttons,
    },
    evaluate, initialState, REFERENCE_BOARD, adviceView, allowedMovesText, askForHint, structuredClone,
  }, { filename: 'browser/app.mjs' });
  return {
    get: (id) => elements[`#${id}`],
    hint: () => elements['#hint'].listeners.click(),
    move: (direction) => buttons.find((button) => button.dataset.move === direction).listeners.click(),
  };
}

test('completed advice clears after accepted moves, including a win; rejected moves retain it', async () => {
  let direction = 'east';
  const ui = page(async () => envelope(direction));
  await ui.hint();
  const advice = ui.get('advice').textContent;
  const why = ui.get('why').textContent;
  assert.match(advice, /^Suggested: east/);
  assert.match(why, /^Permitted: east/);
  ui.move('north');
  assert.equal(ui.get('advice').textContent, advice);
  assert.equal(ui.get('why').textContent, why);
  ui.move('east');
  assert.equal(ui.get('advice').textContent, '');
  assert.equal(ui.get('why').textContent, '');
  ui.move('east');
  ui.move('south');
  direction = 'south';
  await ui.hint();
  assert.match(ui.get('why').textContent, /from \(2,1\)/);
  ui.move('south');
  assert.deepEqual(JSON.parse(ui.get('state').textContent), {
    position: { x: 2, y: 2 }, movesRemaining: 2, score: 10, collected: ['t1'], status: 'won',
  });
  assert.equal(ui.get('allowed').textContent, 'Allowed moves from (2,2): none (status: won).');
  assert.equal(ui.get('advice').textContent, '');
  assert.equal(ui.get('why').textContent, '');
});

test('moving during a hint preserves loading until the stale response is discarded', async () => {
  let resolveHint;
  const response = new Promise((resolve) => { resolveHint = resolve; });
  const ui = page(() => response);
  const pending = ui.hint();
  assert.equal(ui.get('hint').disabled, true);
  assert.equal(ui.get('advice').textContent, 'Loading advice...');
  ui.move('east');
  assert.equal(ui.get('advice').textContent, 'Loading advice...');
  assert.equal(ui.get('hint').disabled, true);
  resolveHint(envelope('east'));
  await pending;
  assert.equal(ui.get('advice').textContent, 'State changed while waiting; request fresh advice.');
  assert.equal(ui.get('why').textContent, '');
  assert.equal(ui.get('hint').disabled, false);
  assert.deepEqual(JSON.parse(ui.get('state').textContent), {
    position: { x: 1, y: 0 }, movesRemaining: 5, score: 0, collected: [], status: 'playing',
  });
});
