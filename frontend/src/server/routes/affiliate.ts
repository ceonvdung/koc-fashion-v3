import { Hono } from 'hono';
import { authenticate } from '../middleware/auth';
import { getAffiliateStats, getAffiliateCommissions, recordClick } from '../db';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.post('/click', async (c) => {
  const { ref } = await c.req.json();
  if (!ref) return c.json({ message: 'Missing ref' }, 400);
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined;
  const userAgent = c.req.header('user-agent');
  await recordClick(ref, ip, userAgent);
  return c.json({ ok: true });
});

router.use('*', authenticate);

router.get('/stats', async (c) => {
  const userId = c.get('userId');
  const stats = await getAffiliateStats(userId);
  return c.json(stats);
});

router.get('/commissions', async (c) => {
  const userId = c.get('userId');
  const commissions = await getAffiliateCommissions(userId);
  return c.json(commissions);
});

export default router;
