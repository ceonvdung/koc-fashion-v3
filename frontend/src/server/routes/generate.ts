import { Hono } from 'hono';
import { authenticate } from '../middleware/auth';
import { findGenerationById, listGenerationsByUser, deleteGeneration, updateGeneration, logActivity } from '../db';
import { updateUserActivity } from '../services/job-queue';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

router.get('/history', async (c) => {
  const userId = c.get('userId');
  const result = await listGenerationsByUser(userId);
  // Only return generations that have at least one uploaded image (hearted)
  const data = Array.isArray(result)
    ? result.filter((gen: any) => {
        const images: string[] = Array.isArray(gen.images) ? gen.images : [];
        return images.some((img: string) => typeof img === 'string' && img.startsWith('http'));
      })
    : (result.data || []).filter((gen: any) => {
        const images: string[] = Array.isArray(gen.images) ? gen.images : [];
        return images.some((img: string) => typeof img === 'string' && img.startsWith('http'));
      });
  return c.json({ data, total: data.length });
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const role = c.get('userRole');

  updateUserActivity(userId);

  const generation = await findGenerationById(id);
  if (!generation) {
    return c.json({ message: 'Generation not found' }, 404);
  }

  if (role !== 'super_admin' && generation.userId !== userId) {
    return c.json({ message: 'Generation not found' }, 404);
  }

  return c.json(generation);
});

router.delete('/:id/images/:imageIndex', async (c) => {
  const id = c.req.param('id');
  const imageIndexStr = c.req.param('imageIndex');
  const imageIndex = parseInt(imageIndexStr, 10);
  const userId = c.get('userId');
  const role = c.get('userRole');

  const generation = await findGenerationById(id);
  if (!generation) {
    return c.json({ message: 'Generation not found' }, 404);
  }

  if (role !== 'super_admin' && generation.userId !== userId) {
    return c.json({ message: 'Generation not found' }, 404);
  }

  const images = typeof generation.images === 'string'
    ? JSON.parse(generation.images)
    : (generation.images || []) as string[];

  if (imageIndex < 0 || imageIndex >= images.length) {
    return c.json({ message: 'Invalid image index' }, 400);
  }

  images[imageIndex] = null;
  await updateGeneration(id, { images });
  await logActivity(userId, 'delete_image', `Deleted image #${imageIndex} from generation #${id}`);
  const { removeFavorite } = await import('../db/supabase');
  await removeFavorite(userId, id, imageIndex).catch(() => {});

  return c.json({ message: 'Image deleted', images });
});

router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const role = c.get('userRole');

    const generation = await findGenerationById(id);
    if (!generation) {
      return c.json({ message: 'Generation not found' }, 404);
    }

    if (role !== 'super_admin' && generation.userId !== userId) {
      return c.json({ message: 'Generation not found' }, 404);
    }

    await deleteGeneration(id);
    await logActivity(userId, 'delete_generation', `Deleted generation #${id}`);
    return c.json({ message: 'Generation deleted successfully' });
  } catch (err) {
    console.error('Delete generation error:', err);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

export default router;
