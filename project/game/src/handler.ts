// Supplied hint handler: checks the request, derives permitted actions from the rules, calls the
// adapter once (with a deadline), validates the answer and falls back deterministically.
// Advice is display data: this module never calls the move operation or changes the posted state.
import type { Envelope, Hint, HintInput, ModelClient, Outcome } from './contracts.js';
import { allowedActions, REFERENCE_BOARD, type Board, type GameState } from './rules.js';
import { requestHint } from './request-hint.js';
import { fallbackHint, isRecord, validHint } from './validation.js';
import { MalformedResponseError, TimeoutError, withTimeout } from './clients.js';
import { recordHint, type Event as HintEvent } from './instrumentation.js'; // [instrumentation]

export const REFERENCE_TIMEOUT_MS = 2000;

export interface Clock { now(): number }

export interface HandlerDeps {
  requestId: string;
  client: ModelClient;
  timeoutMs?: number;
  board?: Board;
  clock?: Clock; // [instrumentation]
  emit?: (event: HintEvent) => void; // [instrumentation]
}

export class BadRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequest';
  }
}

const STATUSES = ['playing', 'won', 'lost'];
const isInt = (v: unknown): v is number => Number.isInteger(v);

// Checks the posted body. Extra properties are not removed here: the adapter selects model fields.
export function readRequest(body: unknown, board: Board = REFERENCE_BOARD): { boardId: string; state: GameState } {
  if (!isRecord(body)) throw new BadRequest('body must be a JSON object');
  if (body.boardId !== undefined && body.boardId !== board.id) throw new BadRequest(`unknown board: ${String(body.boardId)}`);
  const state = body.state;
  if (!isRecord(state) || !isRecord(state.position)) throw new BadRequest('state.position is required');
  const { position, movesRemaining, score, collected, status } = state;
  if (!isRecord(position) || !isInt(position.x) || !isInt(position.y)) throw new BadRequest('position needs integer x and y');
  if (!isInt(movesRemaining) || movesRemaining < 0) throw new BadRequest('movesRemaining must be a non-negative integer');
  if (typeof score !== 'number' || !Array.isArray(collected) || !collected.every((c) => typeof c === 'string')) {
    throw new BadRequest('score and collected are required');
  }
  if (typeof status !== 'string' || !STATUSES.includes(status)) throw new BadRequest('unknown status');
  return { boardId: board.id, state: state as unknown as GameState };
}

// Public hint: only the documented fields, whatever else the client returned.
function project(hint: Hint): Hint {
  return { action: { type: 'move', direction: hint.action.direction }, explanation: hint.explanation };
}

function classify(error: unknown): Outcome {
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof MalformedResponseError) return 'validation-failure'; // arrived, but not a hint
  return 'provider-failure';
}

export async function handleHint(body: unknown, deps: HandlerDeps): Promise<Envelope> {
  const clock = deps.clock ?? performance; // [instrumentation]
  const startedMs = clock.now(); // [instrumentation]
  const board = deps.board ?? REFERENCE_BOARD;
  const { boardId, state } = readRequest(body, board);
  const allowed = allowedActions(board, state);
  let result: Envelope;
  let outcome: Outcome;

  if (allowed.length === 0) {
    // Completed game: no permitted action, no model call, no invented move.
    result = fallbackHint(allowed, deps.requestId);
    outcome = 'no-action';
  } else {
    const input: HintInput = {
      requestId: deps.requestId,
      // position is passed through as posted; requestHint selects the documented leaf fields.
      game: { boardId, position: state.position, movesRemaining: state.movesRemaining },
      allowedActions: allowed,
    };
    try {
      const proposed = await requestHint(input, withTimeout(deps.client, deps.timeoutMs ?? REFERENCE_TIMEOUT_MS));
      if (validHint(proposed.hint, allowed)) {
        result = { hint: project(proposed.hint), source: 'model', requestId: deps.requestId };
        outcome = 'model-success';
      } else {
        result = fallbackHint(allowed, deps.requestId);
        outcome = 'validation-failure';
      }
    } catch (error) {
      result = fallbackHint(allowed, deps.requestId);
      outcome = classify(error);
    }
  }

  // Completion hook: validation or fallback selection has finished. // [instrumentation]
  const finishedMs = clock.now(); // [instrumentation]
  recordHint({ requestId: deps.requestId, startedMs, finishedMs, outcome, result }, deps.emit ?? (() => {})); // [instrumentation]
  return result;
}
