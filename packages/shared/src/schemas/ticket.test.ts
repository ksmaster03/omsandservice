import { describe, it, expect } from 'vitest';
import {
  createTicketSchema,
  updateTicketStageSchema,
  rateTicketSchema,
  techLocationPingSchema,
  presignedUploadSchema,
} from './ticket';

const validAssetId = '00000000-0000-0000-0000-000000000001';

describe('createTicketSchema', () => {
  it('accepts a minimal valid ticket', () => {
    const result = createTicketSchema.safeParse({
      assetId: validAssetId,
      problemType: 'BELT',
      priority: 'URGENT',
      description: 'สายพานลื่น วิ่งแล้วสะดุด',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all 6 problem types', () => {
    for (const problemType of ['BELT', 'NOISE', 'CONSOLE', 'MOTOR', 'POWER', 'OTHER'] as const) {
      const result = createTicketSchema.safeParse({
        assetId: validAssetId,
        problemType,
        priority: 'NORMAL',
        description: 'ทดสอบ',
      });
      expect(result.success, `${problemType} should be valid`).toBe(true);
    }
  });

  it('accepts all 3 priorities', () => {
    for (const priority of ['URGENT', 'NORMAL', 'LOW'] as const) {
      const result = createTicketSchema.safeParse({
        assetId: validAssetId,
        problemType: 'OTHER',
        priority,
        description: 'ทดสอบระดับความเร่งด่วน',
      });
      expect(result.success).toBe(true);
    }
  });

  it('caps photos at max 5', () => {
    const result = createTicketSchema.safeParse({
      assetId: validAssetId,
      problemType: 'OTHER',
      priority: 'LOW',
      description: 'too many photos',
      photoKeys: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 5 photos', () => {
    const result = createTicketSchema.safeParse({
      assetId: validAssetId,
      problemType: 'OTHER',
      priority: 'LOW',
      description: 'exactly 5',
      photoKeys: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(result.success).toBe(true);
  });

  it('validates lat/lng bounds', () => {
    expect(
      createTicketSchema.safeParse({
        assetId: validAssetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'bad coords',
        locationLat: 200,
        locationLng: 0,
      }).success,
    ).toBe(false);
  });

  it('rejects non-uuid assetId', () => {
    const result = createTicketSchema.safeParse({
      assetId: 'not-a-uuid',
      problemType: 'OTHER',
      priority: 'LOW',
      description: 'bad id',
    });
    expect(result.success).toBe(false);
  });

  it('requires description min 5 chars', () => {
    expect(
      createTicketSchema.safeParse({
        assetId: validAssetId,
        problemType: 'OTHER',
        priority: 'LOW',
        description: 'hi',
      }).success,
    ).toBe(false);
  });
});

describe('updateTicketStageSchema', () => {
  it('accepts all 7 stages', () => {
    for (const stage of [
      'RECEIVED',
      'ASSIGNED',
      'EN_ROUTE',
      'ARRIVED',
      'REPAIRING',
      'CLOSED',
      'CANCELLED',
    ] as const) {
      expect(updateTicketStageSchema.safeParse({ stage }).success).toBe(true);
    }
  });

  it('rejects unknown stage', () => {
    expect(updateTicketStageSchema.safeParse({ stage: 'UNKNOWN' }).success).toBe(false);
  });
});

describe('rateTicketSchema', () => {
  it('accepts rating 1-5', () => {
    for (let r = 1; r <= 5; r++) {
      expect(rateTicketSchema.safeParse({ rating: r }).success).toBe(true);
    }
  });

  it('rejects rating 0 or 6', () => {
    expect(rateTicketSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(rateTicketSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    expect(rateTicketSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });
});

describe('techLocationPingSchema', () => {
  it('accepts a valid ping', () => {
    expect(
      techLocationPingSchema.safeParse({
        lat: 13.7442,
        lng: 100.5413,
        accuracy: 15,
      }).success,
    ).toBe(true);
  });

  it('rejects lat > 90', () => {
    expect(techLocationPingSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
  });

  it('rejects lng < -180', () => {
    expect(techLocationPingSchema.safeParse({ lat: 0, lng: -181 }).success).toBe(false);
  });
});

describe('presignedUploadSchema', () => {
  it('accepts photo upload request', () => {
    expect(
      presignedUploadSchema.safeParse({
        type: 'photo',
        mime: 'image/jpeg',
        size: 1024 * 500,
      }).success,
    ).toBe(true);
  });

  it('accepts video upload request', () => {
    expect(
      presignedUploadSchema.safeParse({
        type: 'video',
        mime: 'video/mp4',
        size: 1024 * 1024 * 40,
      }).success,
    ).toBe(true);
  });

  it('rejects zero or negative size', () => {
    expect(
      presignedUploadSchema.safeParse({ type: 'photo', mime: 'image/png', size: 0 }).success,
    ).toBe(false);
  });

  it('rejects unknown type', () => {
    expect(
      presignedUploadSchema.safeParse({ type: 'audio', mime: 'audio/mp3', size: 100 }).success,
    ).toBe(false);
  });
});
