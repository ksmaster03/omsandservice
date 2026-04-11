/**
 * Shared test helper — spins up a fresh server instance + returns
 * a helper that injects pre-authenticated staff requests.
 */
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server';

export async function makeTestApp(): Promise<FastifyInstance> {
  const app = await buildServer();
  await app.ready();
  return app;
}

export async function loginAs(
  app: FastifyInstance,
  email: string,
  password = 'Nba@12345',
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
  if (res.statusCode !== 200) throw new Error(`login failed for ${email}: ${res.body}`);
  return res.json().data.accessToken as string;
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}
