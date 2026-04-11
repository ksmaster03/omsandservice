import type { FastifyPluginAsync } from 'fastify';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  userListQuerySchema,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/hash';
import { paginate, toPrismaPagination } from '../lib/pagination';

const userRoutes: FastifyPluginAsync = async (app) => {
  // All user-management routes are admin-only
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('ADMIN'));

  const publicFields = {
    id: true,
    email: true,
    name: true,
    phone: true,
    role: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  };

  // ─── GET /users ───
  app.get('/', async (req, reply) => {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.role) where.role = q.role;
    if (q.active !== undefined) where.active = q.active;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: publicFields,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
      }),
      prisma.user.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /users/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: publicFields,
    });
    if (!user) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return { ok: true, data: user };
  });

  // ─── POST /users ─── (create new staff)
  app.post('/', async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { password, ...rest } = parsed.data;
    try {
      const user = await prisma.user.create({
        data: { ...rest, passwordHash: await hashPassword(password) },
        select: publicFields,
      });
      return reply.code(201).send({ ok: true, data: user });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        return reply.code(409).send({ ok: false, error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } });
      }
      throw err;
    }
  });

  // ─── PATCH /users/:id ─── (update profile/role/active)
  app.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: parsed.data,
        select: publicFields,
      });
      return { ok: true, data: user };
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
  });

  // ─── POST /users/:id/password ─── (admin reset)
  app.post<{ Params: { id: string } }>('/:id/password', async (req, reply) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    try {
      await prisma.user.update({
        where: { id: req.params.id },
        data: { passwordHash: await hashPassword(parsed.data.newPassword) },
      });
      return { ok: true, data: { updated: true } };
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
  });
};

export default userRoutes;
