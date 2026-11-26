// P3 presentation boundary: turns board, state and a hint envelope into display text.
// Pure: no DOM, fetch, clock or randomness, and inputs are never mutated. Legality is read from
// allowedActions in rules.ts and never recomputed here. Nothing in this module applies a move.
import type { Envelope } from './contracts.js';
import { allowedActions, type Board, type GameState } from './rules.js';

export const STALE_TEXT = 'State changed while waiting; request fresh advice.';

export interface AdviceView {
  advice: string; // the advice line (same wording as the supplied browser flow)
  why: string;    // why the offered move is permitted, or why nothing is offered
}

const where = (state: GameState) => `(${state.position.x},${state.position.y})`;
const permitted = (board: Board, state: GameState) => allowedActions(board, state).map((a) => a.direction);

// The allowed moves for the current state.
export function allowedMovesText(board: Board, state: GameState): string {
  const moves = permitted(board, state);
  return moves.length > 0
    ? `Allowed moves from ${where(state)}: ${moves.join(', ')}.`
    : `Allowed moves from ${where(state)}: none (status: ${state.status}).`;
}

// Display data for one hint envelope. `requested` is the state snapshot the hint was asked for;
// a changed state version means the envelope is stale and is not shown at all.
export function adviceView(board: Board, requested: GameState, envelope: Envelope,
  savedVersion: number, currentVersion: number): AdviceView {
  if (savedVersion !== currentVersion) return { advice: STALE_TEXT, why: '' };
  const tag = `(source: ${envelope.source}, request ID: ${envelope.requestId})`;
  const moves = permitted(board, requested);
  if (envelope.hint === null) {
    return { advice: `No permitted action. ${tag}`, why: `Nothing to suggest: ${allowedMovesText(board, requested)}` };
  }
  const { direction } = envelope.hint.action;
  const advice = `Suggested: ${direction} - ${envelope.hint.explanation} ${tag}`;
  if (!moves.includes(direction)) {
    // The server already validates; this only refuses to call an unexpected move permitted.
    return { advice, why: `Not permitted: ${direction} is not an allowed move from ${where(requested)} (${moves.join(', ') || 'none'}).` };
  }
  const rule = envelope.source === 'fallback' ? ' Fallback rule: the first allowed move in north, east, south, west order.' : '';
  return { advice, why: `Permitted: ${direction} is an allowed move from ${where(requested)} (${moves.join(', ')}).${rule}` };
}
