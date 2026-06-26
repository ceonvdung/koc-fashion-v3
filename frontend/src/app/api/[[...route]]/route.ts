import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

import authRouter from '@/server/routes/auth';
import adminRouter from '@/server/routes/admin';
import generateRouter from '@/server/routes/generate';
import generateSingleRouter from '@/server/routes/generate-single';
import generateTwoRouter from '@/server/routes/generate-two';
import debugRouter from '@/server/routes/debug';
import affiliateRouter from '@/server/routes/affiliate';
import feedbackRouter from '@/server/routes/feedback';
import favoritesRouter from '@/server/routes/favorites';

const app = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002']);

// Build origin function for Hono CORS
const corsOrigin = (origin: string): string | null | undefined => {
  // Allow requests with no origin (mobile apps, etc.)
  if (!origin) return '*';
  
  // In production, if ALLOWED_ORIGINS is set, check against it
  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    return null;
  }
  
  // In development, allow localhost (any port)
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }
    return null;
  }
  
  // In production without ALLOWED_ORIGINS, reject (security)
  return null;
};

app.use('*', cors({
  origin: corsOrigin,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.get('/', (c) => c.json({ name: 'KOC Fashion Image Generator API', version: '3.0.0' }));

app.route('/api/generate/single', generateSingleRouter);
app.route('/api/generate/two', generateTwoRouter);
app.route('/api/debug', debugRouter);
app.route('/api/auth', authRouter);
app.route('/api/admin', adminRouter);
app.route('/api/generate', generateRouter);
app.route('/api/feedback', feedbackRouter);
app.route('/api/favorites', favoritesRouter);
app.route('/api/affiliate', affiliateRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status as any);
  }
  console.error('Unhandled error:', err);
  return c.json({ message: 'Internal server error' }, 500);
});

async function handler(request: Request) {
  return app.fetch(request);
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
