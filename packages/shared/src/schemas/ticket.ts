import { z } from 'zod';
import { PRIORITIES, PROBLEM_TYPES, TICKET_STAGES } from '../constants';

export const createTicketSchema = z.object({
  assetId: z.string().uuid(),
  problemType: z.enum(PROBLEM_TYPES),
  priority: z.enum(PRIORITIES),
  description: z.string().min(5).max(2000),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAddress: z.string().max(500).optional(),
  locationDetail: z.string().max(500).optional(),
  photoKeys: z.array(z.string()).max(5).default([]),
  videoKey: z.string().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketStageSchema = z.object({
  stage: z.enum(TICKET_STAGES),
  note: z.string().max(1000).optional(),
});
export type UpdateTicketStageInput = z.infer<typeof updateTicketStageSchema>;

export const rateTicketSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});
export type RateTicketInput = z.infer<typeof rateTicketSchema>;

export const techLocationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  activeTicketId: z.string().uuid().optional(),
});
export type TechLocationPingInput = z.infer<typeof techLocationPingSchema>;

export const presignedUploadSchema = z.object({
  type: z.enum(['photo', 'video']),
  mime: z.string().min(1).max(100),
  size: z.number().int().positive(),
});
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
