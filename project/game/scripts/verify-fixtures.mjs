// Checks the compiled rule evaluator against the shared course fixtures F01-F11 (13 files).
// Usage (after tsc):  node scripts/verify-fixtures.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert/strict';
import { evaluate, initialState } from '../dist/rules.js';

const dir = new URL('../fixtures/', import.meta.url);
const load = (p) => JSON.parse(readFileSync(new URL(p, dir), 'utf8'));
const board = load('board-reference.json');
let failed = 0;
for (const file of readdirSync(new URL('treasure/', dir)).sort()) {
  const f = load(`treasure/${file}`);
  const before = JSON.stringify(f.state);
  const actual = f.state === null
    ? { accepted: null, reason: null, state: initialState(board) }
    : evaluate(board, f.state, f.action);
  try {
    deepStrictEqual(actual, f.expected);
    if (f.state !== null && JSON.stringify(f.state) !== before) throw new Error('input state was mutated');
    console.log(`PASS ${f.id}  ${f.description}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${f.id}  ${e.message.split('\n')[0]}`);
  }
}
console.log(failed ? `${failed} fixture(s) failed` : 'All fixtures pass');
process.exit(failed ? 1 : 0);
