import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { addFeedback, getUserFeedbackStats, getUserPreferences, saveUserPreferences } from '../db';
import { processFeedback } from '../services/feedbackEngine';
import { loadUserDNA, saveUserDNA } from '../services/preferenceEngine';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

const feedbackSchema = z.object({
  generationId: z.string(),
  imageIndex: z.number().int().min(0),
  action: z.enum(['download', 'delete', 'favorite', 'set_default', 'fullscreen', 'zoom', 'regenerate']),
  metadata: z.object({
    scene: z.string().optional(),
    camera: z.string().optional(),
    style: z.string().optional(),
    lighting: z.string().optional(),
    mood: z.string().optional(),
    pose: z.string().optional(),
    ratio: z.string().optional(),
    faceSimilarity: z.number().optional(),
    outfitSimilarity: z.number().optional(),
    productSimilarity: z.number().optional(),
    qualityScore: z.number().optional(),
  }).optional(),
});

router.post('/', zValidator('json', feedbackSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');

  const result = await processFeedback({
    userId,
    generationId: data.generationId,
    imageIndex: data.imageIndex,
    action: data.action,
    metadata: data.metadata,
  });

  return c.json({ message: 'Feedback recorded', score: result.score }, 201);
});

router.get('/stats', async (c) => {
  const userId = c.get('userId');
  const days = parseInt(c.req.query('days') || '7', 10);
  const stats = await getUserFeedbackStats(userId, days);
  return c.json(stats);
});

router.get('/dna', async (c) => {
  const userId = c.get('userId');
  const dna = await loadUserDNA(userId);
  return c.json(dna);
});

router.get('/preferences', async (c) => {
  const userId = c.get('userId');
  const prefs = await getUserPreferences(userId);
  return c.json(prefs || {});
});

export default router;
