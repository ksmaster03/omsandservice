import { describe, it, expect } from 'vitest';
import { canTransitionRma, rmaAllowedTransitions } from './rma';

describe('rma state machine', () => {
  it('allows REQUESTED → APPROVED', () => {
    expect(canTransitionRma('REQUESTED', 'APPROVED')).toBe(true);
  });

  it('allows REQUESTED → REJECTED', () => {
    expect(canTransitionRma('REQUESTED', 'REJECTED')).toBe(true);
  });

  it('blocks REQUESTED → REFUNDED (must go through inspection)', () => {
    expect(canTransitionRma('REQUESTED', 'REFUNDED')).toBe(false);
  });

  it('allows INSPECTING → REFUNDED | REPLACED | REFURBISHED', () => {
    const transitions = rmaAllowedTransitions('INSPECTING');
    expect(transitions.find((t) => t.to === 'REFUNDED')).toBeTruthy();
    expect(transitions.find((t) => t.to === 'REPLACED')).toBeTruthy();
    expect(transitions.find((t) => t.to === 'REFURBISHED')).toBeTruthy();
  });

  it('REJECTED is terminal', () => {
    expect(rmaAllowedTransitions('REJECTED')).toEqual([]);
  });

  it('REFUNDED is terminal', () => {
    expect(rmaAllowedTransitions('REFUNDED')).toEqual([]);
  });
});
