// Terminal event for one hint request: request id, handler latency, outcome, fallback use. Nothing else.
import type { Envelope, Outcome } from './contracts.js';

export interface Facts {
  requestId: string;
  startedMs: number;   // supplied clock at handler entry
  finishedMs: number;  // supplied clock when validation or fallback selection finished
  outcome: Outcome;
  result: Envelope;    // supplied so fallback use can be derived; never copied into the event
}

export interface Event {
  requestId: string;
  latencyMs: number;
  outcome: Outcome;
  fallback: boolean;
}

export function recordHint(facts: Facts,
  emit: (event: Event) => void): void {
  emit({
    requestId: facts.requestId,
    latencyMs: facts.finishedMs - facts.startedMs,
    outcome: facts.outcome,
    fallback: facts.result.source === 'fallback'
  });
}
