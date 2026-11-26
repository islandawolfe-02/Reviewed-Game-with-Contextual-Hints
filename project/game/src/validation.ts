// Response guard and deterministic fallback.
import type { Envelope, Hint, MoveAction } from './contracts.js';
import { DIRECTION_ORDER } from './rules.js';

export const MAX_EXPLANATION_UNITS = 160; // JavaScript (UTF-16) string length, not displayed symbols
export const FALLBACK_EXPLANATION = 'A permitted next move.';

// Primitive record check (supplied): excludes null and arrays before nested property access.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Supplied direction check: a known direction value. Knowing the value is not the same as permitted.
export function isDirection(value: unknown): value is MoveAction['direction'] {
  return typeof value === 'string' && (DIRECTION_ORDER as readonly string[]).includes(value);
}

// True only when the candidate has the agreed shape/content AND its action is in the
// independently derived allowed list for this state. Extra fields are tolerated here;
// the handler projects only the documented fields into the public hint.
export function validHint(candidate: unknown, allowed: readonly MoveAction[]): candidate is Hint {
  if (!isRecord(candidate) || !isRecord(candidate.action)) return false;
  const { type, direction } = candidate.action;
  if (type !== 'move' || !isDirection(direction)) return false;
  const explanation = candidate.explanation;
  if (typeof explanation !== 'string') return false;
  if (explanation.trim().length === 0 || explanation.length > MAX_EXPLANATION_UNITS) return false;
  return allowed.some((action) => action.direction === direction);
}

// Deterministic fallback: first permitted action in the supplied (N, E, S, W) order, or null.
export function fallbackHint(allowed: readonly MoveAction[], requestId: string): Envelope {
  const first = allowed[0];
  return {
    hint: first ? { action: { type: 'move', direction: first.direction }, explanation: FALLBACK_EXPLANATION } : null,
    source: 'fallback',
    requestId,
  };
}
