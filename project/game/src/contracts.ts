// Supplied types for the hint boundary. Advice is display data: nothing here changes GameState.
import type { Direction, GameState, MoveAction, Position } from './rules.js';

export type { Direction, GameState, MoveAction, Position };

// Selected game context the model may see (no browser object, no credentials, no request id).
export interface GameContext {
  boardId: string;
  position: Position;
  movesRemaining: number;
}

// What the supplied handler passes to requestHint.
export interface HintInput {
  requestId: string;
  game: GameContext;
  allowedActions: MoveAction[];
}

// The payload the model client receives.
export interface ModelRequest {
  context: GameContext;
  allowedActions: MoveAction[];
}

// The agreed hint shape. A model client *claims* to resolve to this; validation checks it at runtime.
export interface Hint {
  action: MoveAction;
  explanation: string;
}

export interface ClientOptions { signal?: AbortSignal }

// Server-side model client. The deterministic stub and any prepared live client share this shape.
export type ModelClient = (request: ModelRequest, options?: ClientOptions) => Promise<Hint>;

// Public envelope returned by POST /api/hint.
export interface Envelope {
  hint: Hint | null;
  source: 'model' | 'fallback';
  requestId: string;
}

// Body posted by the browser: a board identifier, a state snapshot and the browser's state version.
export interface HintRequestBody {
  boardId: string;
  state: GameState;
  stateVersion: number;
}

export type Outcome = 'model-success' | 'validation-failure' | 'timeout' | 'provider-failure' | 'no-action';
