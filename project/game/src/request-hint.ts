// Adapter: select documented model context, call the injected client once, return the envelope.
import type { Envelope, HintInput, ModelClient } from './contracts.js';

export async function requestHint(input: HintInput, client: ModelClient): Promise<Envelope> {
  // Select documented leaf fields only. A spread would also copy display-only properties
  // that exist at runtime inside nested objects (for example position.displayLabel).
  const hint = await client({
    context: {
      boardId: input.game.boardId,
      position: { x: input.game.position.x, y: input.game.position.y },
      movesRemaining: input.game.movesRemaining,
    },
    allowedActions: input.allowedActions.map((action) => ({ type: action.type, direction: action.direction })),
  });
  // The request id stays out of model context; it returns with this request's envelope.
  return { hint, source: 'model', requestId: input.requestId };
}
