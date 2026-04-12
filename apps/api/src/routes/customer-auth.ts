/**
 * Customer PWA auth routes — dev OTP bypass for Sprint 5.
 *
 * Flow:
 *   1. POST /customer/auth/request-otp  { phone }
 *      → Returns { sent: true, dev_code: "000000" }
 *      (Returns dev_code in response so the PWA can autofill; in prod with
 *       real SMS/LINE, this field disappears.)
 *
 *   2. POST /customer/auth/verify-otp  { phone, code }
 *      → Any 6-digit code works in dev. Creates CustomerUser if missing
 *        and links to the first Customer matching the phone.
 *      → Returns { accessToken, user }
 *
 * Swap to real LINE Login by replacing verify-otp with an endpoint that
 * validates a LINE idToken against the LINE API and sets line_user_id.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requestOtpSchema, verifyOtpSchema, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '@oms/shared';
import { prisma } from '../lib/prisma';
import { verifyGoogleIdToken } from '../lib/google-auth';

const DEV_CODE = '000000';

const googleLoginSchema = z.object({ idToken: z.string().min(10) });

const customerAuthRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /customer/auth/request-otp ───
  app.post('/request-otp', async (req, reply) => {
    const parsed = requestOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    // In prod: store OTP in `otp_codes` table, send SMS/LINE. For dev, no-op.
    app.log.info({ phone: parsed.data.phone }, 'OTP requested (dev bypass)');
    return {
      ok: true,
      data: {
        sent: true,
        dev_code: DEV_CODE,
        message: 'DEV MODE: any 6-digit code is accepted',
      },
    };
  });

  // ─── POST /customer/auth/verify-otp ───
  app.post('/verify-otp', async (req, reply) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { phone, code } = parsed.data;
    // Dev bypass: any 6-digit code is valid
    void code;

    // Find or create a CustomerUser linked by phone.
    // Priority order:
    //   1. Existing CustomerUser with this phone
    //   2. Customer (master) with this phone → create CustomerUser linked to it
    //   3. No match → 401 ("Your number isn't registered — call sales")
    let customerUser = await prisma.customerUser.findFirst({ where: { phone } });
    if (!customerUser) {
      const customer = await prisma.customer.findFirst({ where: { phone } });
      if (!customer) {
        return reply.code(401).send({
          ok: false,
          error: {
            code: 'NOT_REGISTERED',
            message: 'Phone not registered as a customer. Please contact sales.',
          },
        });
      }
      customerUser = await prisma.customerUser.create({
        data: {
          customerId: customer.id,
          phone,
          displayName: customer.contactName ?? customer.name,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await prisma.customerUser.update({
        where: { id: customerUser.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const accessToken = app.jwt.sign(
      {
        scope: 'customer',
        sub: customerUser.id,
        customerId: customerUser.customerId,
      },
      { expiresIn: JWT_ACCESS_TTL },
    );
    const refreshToken = app.jwt.sign(
      {
        scope: 'customer',
        sub: customerUser.id,
        customerId: customerUser.customerId,
      },
      { expiresIn: JWT_REFRESH_TTL },
    );

    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: customerUser.id,
          customerId: customerUser.customerId,
          displayName: customerUser.displayName,
          phone: customerUser.phone,
        },
      },
    };
  });

  // ─── POST /customer/auth/google ───
  // Match the Google account to an existing Customer by email.
  // No auto-create: if no Customer has this email, sales must register first.
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

    // 1) Existing CustomerUser by email
    let customerUser = await prisma.customerUser.findFirst({ where: { email: profile.email } });

    // 2) Or find a Customer with matching email → create CustomerUser
    if (!customerUser) {
      const customer = await prisma.customer.findFirst({
        where: { email: profile.email, active: true },
      });
      if (!customer) {
        return reply.code(401).send({
          ok: false,
          error: {
            code: 'NOT_REGISTERED',
            message: `${profile.email} is not registered as a customer — contact sales`,
          },
        });
      }
      customerUser = await prisma.customerUser.create({
        data: {
          customerId: customer.id,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.picture,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await prisma.customerUser.update({
        where: { id: customerUser.id },
        data: {
          lastLoginAt: new Date(),
          displayName: customerUser.displayName || profile.name,
          avatarUrl: customerUser.avatarUrl ?? profile.picture,
        },
      });
    }

    const accessToken = app.jwt.sign(
      { scope: 'customer', sub: customerUser.id, customerId: customerUser.customerId },
      { expiresIn: JWT_ACCESS_TTL },
    );
    const refreshToken = app.jwt.sign(
      { scope: 'customer', sub: customerUser.id, customerId: customerUser.customerId },
      { expiresIn: JWT_REFRESH_TTL },
    );

    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: customerUser.id,
          customerId: customerUser.customerId,
          displayName: customerUser.displayName,
          phone: customerUser.phone,
          email: customerUser.email,
        },
      },
    };
  });

  // ─── GET /customer/auth/me ───
  app.get('/me', { preHandler: [app.authenticateCustomer] }, async (req, reply) => {
    const session = req.customerSession!;
    const cu = await prisma.customerUser.findUnique({
      where: { id: session.customerUserId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
      },
    });
    if (!cu) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return {
      ok: true,
      data: {
        id: cu.id,
        displayName: cu.displayName,
        phone: cu.phone,
        customer: cu.customer,
      },
    };
  });
};

export default customerAuthRoutes;
