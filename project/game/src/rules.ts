// Reference treasure-hunt rules (TypeScript port of source/shared/reference/treasure-rules.mjs).
// Pure functions: no DOM, clock, randomness or I/O, and inputs are never mutated.
// These rules are the only code allowed to change game state. Hints never call evaluate().

export type Direction = 'north' | 'east' | 'south' | 'west';
export type Status = 'playing' | 'won' | 'lost';
export type Reason = 'WALL' | 'EDGE' | 'INVALID_ACTION' | 'GAME_COMPLETE';

export interface Position { x: number; y: number }
export interface Treasure { id: string; x: number; y: number; value: number }
export interface Board {
  id: string;
  width: number;
  height: number;
  start: Position;
  walls: Position[];
  treasures: Treasure[];
  exit: Position;
  initialMoves: number;
}
export interface GameState {
  position: Position;
  movesRemaining: number;
  score: number;
  collected: string[];
  status: Status;
}
export interface MoveAction { type: 'move'; direction: Direction }
export interface MoveResult { accepted: boolean; reason: Reason | null; state: GameState }

// Fixed north/east/south/west order: used for permitted actions and for the deterministic fallback.
export const DIRECTION_ORDER: readonly Direction[] = ['north', 'east', 'south', 'west'];

const STEPS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

// The reference board from source/shared/fixtures/board-reference.json.
export const REFERENCE_BOARD: Board = {
  id: 'reference',
  width: 3,
  height: 3,
  start: { x: 0, y: 0 },
  walls: [{ x: 1, y: 1 }],
  treasures: [{ id: 't1', x: 2, y: 0, value: 10 }],
  exit: { x: 2, y: 2 },
  initialMoves: 6,
};

export function initialState(board: Board = REFERENCE_BOARD): GameState {
  return {
    position: { x: board.start.x, y: board.start.y },
    movesRemaining: board.initialMoves,
    score: 0,
    collected: [],
    status: 'playing',
  };
}

function copy(state: GameState): GameState {
  return {
    position: { x: state.position.x, y: state.position.y },
    movesRemaining: state.movesRemaining,
    score: state.score,
    collected: [...state.collected],
    status: state.status,
  };
}

function reject(state: GameState, reason: Reason): MoveResult {
  return { accepted: false, reason, state: copy(state) };
}

function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && Object.hasOwn(STEPS, value);
}

export function evaluate(board: Board, state: GameState, action: unknown): MoveResult {
  if (state.status !== 'playing') return reject(state, 'GAME_COMPLETE');
  const candidate = action as { type?: unknown; direction?: unknown } | null | undefined;
  if (!candidate || candidate.type !== 'move' || !isDirection(candidate.direction)) {
    return reject(state, 'INVALID_ACTION');
  }
  const { dx, dy } = STEPS[candidate.direction];
  const x = state.position.x + dx;
  const y = state.position.y + dy;
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return reject(state, 'EDGE');
  if (board.walls.some((w) => w.x === x && w.y === y)) return reject(state, 'WALL');

  const next = copy(state);
  next.position = { x, y };
  next.movesRemaining -= 1;
  for (const t of board.treasures) {
    if (t.x === x && t.y === y && !next.collected.includes(t.id)) {
      next.collected.push(t.id);
      next.score += t.value;
    }
  }
  const allCollected = board.treasures.every((t) => next.collected.includes(t.id));
  // Winning on the exit is checked before the zero-budget loss, so a final-move win counts (F07).
  if (x === board.exit.x && y === board.exit.y && allCollected) next.status = 'won';
  else if (next.movesRemaining === 0) next.status = 'lost';
  return { accepted: true, reason: null, state: next };
}

// Permitted actions for the current state, derived from the rules (never from a model's claim).
// A completed game has no permitted actions.
export function allowedActions(board: Board, state: GameState): MoveAction[] {
  if (state.status !== 'playing') return [];
  return DIRECTION_ORDER
    .filter((direction) => evaluate(board, state, { type: 'move', direction }).accepted)
    .map((direction) => ({ type: 'move', direction }));
}
