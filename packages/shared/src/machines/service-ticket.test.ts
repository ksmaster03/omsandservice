import { describe, it, expect } from 'vitest';
import { canTransition, allowedTransitions } from './service-ticket';

describe('service-ticket state machine', () => {
  it('allows RECEIVED → ASSIGNED', () => {
    expect(canTransition('RECEIVED', 'ASSIGNED')).toBe(true);
  });

  it('blocks RECEIVED → CLOSED (must go through stages)', () => {
    expect(canTransition('RECEIVED', 'CLOSED')).toBe(false);
  });

  it('allows REPAIRING → ARRIVED (revisit)', () => {
    expect(canTransition('REPAIRING', 'ARRIVED')).toBe(true);
  });

  it('blocks CLOSED → anything (terminal)', () => {
    expect(allowedTransitions('CLOSED')).toEqual([]);
  });

  it('CANCEL is available from every non-terminal state', () => {
    const nonTerminal = ['RECEIVED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'REPAIRING'] as const;
    for (const stage of nonTerminal) {
      const transitions = allowedTransitions(stage);
      expect(transitions.find((t) => t.to === 'CANCELLED')).toBeTruthy();
    }
  });

  it('self-transition is allowed', () => {
    expect(canTransition('ASSIGNED', 'ASSIGNED')).toBe(true);
  });
});
