import type { FastifyPluginAsync } from 'fastify';
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';

const productRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /products ───
  app.get('/', async (req, reply) => {
    const parsed = productListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.brand) where.brand = q.brand;
    if (q.category) where.category = q.category;
    if (q.active !== undefined) where.active = q.active;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { sku: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
      }),
      prisma.product.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /products/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    return { ok: true, data: product };
  });

  // ─── POST /products ─── (ADMIN only)
  app.post('/', { preHandler: [app.requireRole('ADMIN')] }, async (req, reply) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    try {
      const product = await prisma.product.create({ data: parsed.data });
      return reply.code(201).send({ ok: true, data: product });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        return reply.code(409).send({ ok: false, error: { code: 'DUPLICATE_SKU', message: 'SKU already exists' } });
      }
      throw err;
    }
  });

  // ─── PATCH /products/:id ─── (ADMIN only)
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.requireRole('ADMIN')] },
    async (req, reply) => {
      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const product = await prisma.product.update({
          where: { id: req.params.id },
          data: parsed.data,
        });
        return { ok: true, data: product };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      }
    },
  );

  // ─── DELETE /products/:id ─── (ADMIN only)
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.requireRole('ADMIN')] },
    async (req, reply) => {
      try {
        // Soft delete — flip active flag instead of hard delete
        // because products are referenced by SOs/assets/quotes
        const product = await prisma.product.update({
          where: { id: req.params.id },
          data: { active: false },
        });
        return { ok: true, data: { deactivated: true, product } };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      }
    },
  );
};

export default productRoutes;
