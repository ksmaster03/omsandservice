import type { FastifyPluginAsync } from 'fastify';
import { loginSchema, refreshSchema, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '@oms/shared';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { verifyPassword } from '../lib/hash';
import { verifyGoogleIdToken } from '../lib/google-auth';
import { env } from '../config/env';
import jwt from '@fastify/jwt';

const googleLoginSchema = z.object({ idToken: z.string().min(10) });

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

  // ─── Staff: POST /api/v1/auth/google ───
  app.post('/google', async (req, reply) => {
    const parsed = googleLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(parsed.data.idToken);
    } catch (err) {
      app.log.warn({ err }, 'Google ID token verification failed');
      return reply.code(401).send({
        ok: false,
        error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Google sign-in verification failed' },
      });
    }
    if (!profile.emailVerified) {
      return reply.code(401).send({
        ok: false,
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email Google ยังไม่ได้ยืนยัน' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user || !user.active) {
      return reply.code(401).send({
        ok: false,
        error: {
          code: 'NOT_STAFF',
          message: `${profile.email} is not registered as staff — contact administrator`,
        },
      });
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

  // ─── Staff: GET /api/v1/auth/me ───
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    return { ok: true, data: { user: req.authUser } };
  });

  // ─── Staff: PATCH /api/v1/auth/me ─── update own profile
  const updateMeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    password: z.string().min(8).max(128)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .optional(),
  });
  app.patch('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null;
    if (parsed.data.password) {
      updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return { ok: true, data: { updated: false } };
    }

    const user = await prisma.user.update({
      where: { id: req.authUser!.id },
      data: updates,
      select: { id: true, email: true, name: true, phone: true, role: true },
    });

    return { ok: true, data: { user } };
  });
};

export default authRoutes;

// Silence unused import warning — jwt is pulled in via fastify decoration
void jwt;
void env;
