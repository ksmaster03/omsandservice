import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@oms/shared';
import { env } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateCustomer: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: UserRole[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    authUser?: { id: string; email: string; role: UserRole; name: string };
    customerSession?: { customerUserId: string; customerId: string };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload:
      | { scope: 'staff'; sub: string; email: string; role: UserRole; name: string }
      | { scope: 'customer'; sub: string; customerId: string };
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as { scope: string; sub: string; email?: string; role?: UserRole; name?: string };
      if (payload.scope !== 'staff') {
        return reply.code(401).send({ ok: false, error: { code: 'WRONG_SCOPE', message: 'Staff token required' } });
      }
      req.authUser = {
        id: payload.sub,
        email: payload.email!,
        role: payload.role!,
        name: payload.name!,
      };
    } catch {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  });

  app.decorate('authenticateCustomer', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as { scope: string; sub: string; customerId?: string };
      if (payload.scope !== 'customer') {
        return reply.code(401).send({ ok: false, error: { code: 'WRONG_SCOPE', message: 'Customer token required' } });
      }
      req.customerSession = {
        customerUserId: payload.sub,
        customerId: payload.customerId!,
      };
    } catch {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  });

  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.authUser) {
        return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      }
      if (!roles.includes(req.authUser.role)) {
        return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
    };
  });
};

export default fp(authPlugin, { name: 'auth' });
