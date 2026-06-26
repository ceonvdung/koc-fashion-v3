// Standalone local development server
// Run with: ts-node src/dev-server.ts or node --loader ts-node/esm src/dev-server.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { sign, verify } from 'hono/jwt';

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import generateRouter from './routes/generate';
import generateSingleRouter from './routes/generate-single';
import generateTwoRouter from './routes/generate-two';
import debugRouter from './routes/debug';
import feedbackRouter from './routes/feedback';
import affiliateRouter from './routes/affiliate';

// Ensure local dev env vars are set from .env.local
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt';
if (!process.env.LOCAL_DEV) process.env.LOCAL_DEV = 'true';

const app = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.get('/', (c) => c.json({ name: 'KOC Fashion Image Generator API (Local Dev)', version: '3.0.0' }));

// Register specific sub-routes BEFORE parent routes to avoid /:id matching
app.route('/api/generate/single', generateSingleRouter);
app.route('/api/generate/two', generateTwoRouter);
app.route('/api/debug', debugRouter);
app.route('/api/auth', authRouter);
app.route('/api/admin', adminRouter);
app.route('/api/generate', generateRouter);
app.route('/api/feedback', feedbackRouter);
app.route('/api/affiliate', affiliateRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ message: 'Internal server error' }, 500);
});

const PORT = parseInt(process.env.PORT || '5001');



serve({
  fetch: app.fetch,
  port: PORT,
});
