import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const TYPES = ['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION', 'OTHER'] as const;
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const createSchema = z.object({
  type: z.enum(TYPES),
  subject: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  priority: z.enum(PRIORITIES).optional(),
  screenshot: z.string().max(500).optional(),
  source: z.string().max(20).optional(),
  submitterName: z.string().max(100).optional(),
  submitterEmail: z.string().email().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  resolution: z.string().max(2000).optional(),
  assignedTo: z.string().max(100).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

const replySchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

const feedbackRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /feedback ─── public (no auth required for customer/tech submit)
  app.post('/', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } });
    }

    // Try to get user info from JWT if logged in
    let submittedBy: string | null = null;
    let submitterName = parsed.data.submitterName ?? null;
    try {
      await req.jwtVerify();
      const payload = req.user as { sub?: string; name?: string; email?: string; scope?: string };
      submittedBy = payload.sub ?? null;
      if (!submitterName) submitterName = payload.name ?? null;
    } catch {
      // Not logged in — anonymous submit OK
    }

    const feedback = await prisma.feedback.create({
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority ?? 'MEDIUM',
        screenshot: parsed.data.screenshot,
        source: parsed.data.source ?? 'admin',
        submittedBy,
        submitterName,
        submitterEmail: parsed.data.submitterEmail,
      },
    });
    return reply.code(201).send({ ok: true, data: feedback });
  });

  // ─── Below routes require staff auth ───
  app.register(async (staffApp) => {
    staffApp.addHook('preHandler', app.authenticate);

    // ─── GET /feedback ─── list all feedback
    staffApp.get('/', async (req) => {
      const q = req.query as { status?: string; type?: string; page?: string };
      const where: Record<string, unknown> = {};
      if (q.status) where.status = q.status;
      if (q.type) where.type = q.type;
      const page = Number(q.page ?? 1);
      const pageSize = 20;

      const [items, total] = await Promise.all([
        prisma.feedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { _count: { select: { replies: true } } },
        }),
        prisma.feedback.count({ where }),
      ]);
      return {
        ok: true,
        data: { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      };
    });

    // ─── GET /feedback/:id ─── detail with replies
    staffApp.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
      const fb = await prisma.feedback.findUnique({
        where: { id: req.params.id },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      });
      if (!fb) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Feedback not found' } });
      return { ok: true, data: fb };
    });

    // ─── PATCH /feedback/:id ─── update status/priority/assignee
    staffApp.patch<{ Params: { id: string } }>('/:id', { preHandler: [app.requireRole('ADMIN', 'SERVICE')] }, async (req, reply) => {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
      }
      const updates: Record<string, unknown> = { status: parsed.data.status };
      if (parsed.data.resolution !== undefined) updates.resolution = parsed.data.resolution;
      if (parsed.data.assignedTo !== undefined) updates.assignedTo = parsed.data.assignedTo;
      if (parsed.data.priority) updates.priority = parsed.data.priority;
      if (['RESOLVED', 'CLOSED', 'WONT_FIX'].includes(parsed.data.status)) {
        updates.resolvedAt = new Date();
      }
      try {
        const fb = await prisma.feedback.update({ where: { id: req.params.id }, data: updates });
        return { ok: true, data: fb };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Feedback not found' } });
      }
    });

    // ─── POST /feedback/:id/reply ─── add reply
    staffApp.post<{ Params: { id: string } }>('/:id/reply', async (req, reply) => {
      const parsed = replySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
      }
      const r = await prisma.feedbackReply.create({
        data: {
          feedbackId: req.params.id,
          message: parsed.data.message,
          authorName: req.authUser!.name,
          authorRole: req.authUser!.role,
          isInternal: parsed.data.isInternal ?? false,
        },
      });
      return reply.code(201).send({ ok: true, data: r });
    });
  });
};

export default feedbackRoutes;
