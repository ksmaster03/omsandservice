import type { PaymentAdapter, PaymentChargeInput, PaymentChargeResult } from '../types';

/**
 * Mock payment — treats every charge as pending (manual mark-paid flow
 * via /sales-orders/milestones/:id/mark-paid stays as authoritative).
 * Swap with Omise/2C2P/PayPal adapter later.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly mode = 'mock' as const;

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    return {
      status: 'pending',
      providerTxnId: `mock-pay-${input.milestoneId}-${Date.now().toString(36)}`,
    };
  }

  async verify(providerTxnId: string): Promise<PaymentChargeResult> {
    return {
      status: 'pending',
      providerTxnId,
    };
  }
}
