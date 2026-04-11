import type { FastifyPluginAsync } from 'fastify';
import { loginSchema, refreshSchema, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '@oms/shared';
import { prisma } from '../lib/prisma';
import { verifyPassword } from '../lib/hash';
import { env } from '../config/env';
import jwt from '@fastify/jwt';

const authRoutes: FastifyPluginAsync = async (app) => {
  // ─── Staff: POST /api/v1/auth/login ───
  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return reply.code(401).send({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const accessToken = app.jwt.sign(
      { scope: 'staff', sub: user.id, email: user.email, role: user.role, name: user.name },
      { expiresIn: JWT_ACCESS_TTL },
    );
    const refreshToken = app.jwt.sign(
      { scope: 'staff', sub: user.id, email: user.email, role: user.role, name: user.name },
      { expiresIn: JWT_REFRESH_TTL },
    );

    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    };
  });

  // ─── Staff: POST /api/v1/auth/refresh ───
  app.post('/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    }
    try {
      const decoded = app.jwt.verify(parsed.data.refreshToken) as {
        scope: string;
        sub: string;
        email: string;
        role: 'SALES' | 'INSTALL' | 'SERVICE' | 'ADMIN';
        name: string;
      };
      if (decoded.scope !== 'staff') {
        return reply.code(401).send({ ok: false, error: { code: 'WRONG_SCOPE', message: 'Not a staff token' } });
      }
      const accessToken = app.jwt.sign(
        { scope: 'staff', sub: decoded.sub, email: decoded.email, role: decoded.role, name: decoded.name },
        { expiresIn: JWT_ACCESS_TTL },
      );
      return { ok: true, data: { accessToken } };
    } catch {
      return reply.code(401).send({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' } });
    }
  });

  // ─── Staff: GET /api/v1/auth/me ───
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    return { ok: true, data: { user: req.authUser } };
  });
};

export default authRoutes;

// Silence unused import warning — jwt is pulled in via fastify decoration
void jwt;
void env;
