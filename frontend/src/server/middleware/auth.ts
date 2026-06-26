import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { isLocalDev } from '../db';

type AppContext = Context<{
  Variables: {
    userId: string;
    userRole: string;
    userMembershipLevel: number;
  };
}>;

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return async (c: AppContext, next: Next) => {
    if (process.env.NODE_ENV === 'production') {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                 c.req.header('x-real-ip') ||
                 'unknown';
      const now = Date.now();
      const record = loginAttempts.get(ip);

      if (record && record.resetAt > now) {
        if (record.count >= maxAttempts) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000);
          throw new HTTPException(429, {
            message: 'Too many login attempts. Please try again later.',
            res: new Response(null, {
              status: 429,
              headers: { 'Retry-After': String(retryAfter) },
            }),
          });
        }
        record.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
      }
    }
    await next();
  };
}

export async function authenticate(c: AppContext, next: Next) {
  if (isLocalDev()) {
    if (process.env.NODE_ENV === 'production') {
      throw new HTTPException(500, { message: 'LOCAL_DEV is not allowed in production' });
    }
    c.set('userId', 'super-admin');
    c.set('userRole', 'super_admin');
    c.set('userMembershipLevel', 2);
    await next();
    return;
  }

  // Try cookie first, then Authorization header (for backward compatibility)
  const cookieHeader = c.req.header('Cookie');
  let token = null;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('koc_token='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
    }
  }

  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized: No token provided' });
  }

  try {
    const { verifyLocalToken } = await import('../db');
    const payload = await verifyLocalToken(token);
    c.set('userId', payload.userId);
    c.set('userRole', payload.role || 'user');
    c.set('userMembershipLevel', payload.membershipLevel || 1);
    await next();
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized: Invalid token' });
  }
}

export async function requireAdmin(c: AppContext, next: Next) {
  const role = c.get('userRole');
  if (role !== 'super_admin') {
    throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
  }
  await next();
}
