import { describe, it, expect } from 'vitest';
import { loginSchema, createUserSchema, refreshSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@nbasport.local',
      password: 'Nba@12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'Nba@12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 chars', () => {
    const result = loginSchema.safeParse({
      email: 'admin@nbasport.local',
      password: '12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({ email: 'a@b.c' });
    expect(result.success).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    const result = loginSchema.safeParse({
      email: 'a@b.co',
      password: 'x'.repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('accepts a valid staff user', () => {
    const result = createUserSchema.safeParse({
      email: 'sales@nba.local',
      password: 'password123',
      name: 'Somchai',
      role: 'SALES',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'x@y.z',
      password: 'password123',
      name: 'Test',
      role: 'HACKER',
    });
    expect(result.success).toBe(false);
  });

  it('requires password min 8 chars for new users', () => {
    const result = createUserSchema.safeParse({
      email: 'x@y.z',
      password: 'short',
      name: 'Test',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all four valid roles', () => {
    for (const role of ['SALES', 'INSTALL', 'SERVICE', 'ADMIN'] as const) {
      const result = createUserSchema.safeParse({
        email: `${role.toLowerCase()}@nba.local`,
        password: 'password123',
        name: 'Test User',
        role,
      });
      expect(result.success, `role ${role} should be valid`).toBe(true);
    }
  });
});

describe('refreshSchema', () => {
  it('accepts a non-empty refresh token', () => {
    expect(refreshSchema.safeParse({ refreshToken: 'x' }).success).toBe(true);
  });

  it('rejects empty refresh token', () => {
    expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});
