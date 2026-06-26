import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { addFeedback, findGenerationById, updateGeneration } from '../db';
import { isLocalDev } from '../db';
import { getSupabase } from '../db/supabase';
import { uploadImage } from '../services/storage';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

async function removeFavorite(userId: string, generationId: string, imageIndex: number) {
  if (isLocalDev()) {
    const { default: db } = await import('../db/local-db');
    const snapshot = await db.collection('feedbacks').orderBy('createdAt', 'desc').get();
    const docs = snapshot.docs.filter((d: any) =>
      d.data().userId === userId &&
      d.data().generationId === generationId &&
      d.data().imageIndex === imageIndex &&
      d.data().action === 'favorite'
    );
    for (const doc of docs) {
      const docRef = db.collection('feedbacks').doc(doc.id);
      await docRef.delete();
    }
  } else {
    const supabase = await import('../db/supabase');
    await supabase.removeFavorite(userId, generationId, imageIndex);
  }
}

router.get('/', async (c) => {
  const userId = c.get('userId');

  let favorites: any[];
  if (isLocalDev()) {
    const { default: db } = await import('../db/local-db');
    const snapshot = await db.collection('feedbacks').orderBy('createdAt', 'desc').get();
    favorites = snapshot.docs
      .filter((d: any) => d.data().userId === userId && d.data().action === 'favorite')
      .map((d: any) => ({ id: d.id, ...d.data() }));
  } else {
    const supabase = await import('../db/supabase');
    favorites = await supabase.getFavorites(userId);
  }

  // Collect unique generation IDs for batch fetch
  const genIds = [...new Set(favorites.map((f: any) => f.generationId).filter(Boolean))];

  // Batch fetch all generations in one query (fixes N+1)
  const generationsMap = new Map<string, any>();
  if (genIds.length > 0) {
    if (isLocalDev()) {
      const { default: db } = await import('../db/local-db');
      for (const id of genIds) {
        const doc = await db.collection('generations').doc(id).get();
        if (doc.exists) {
          generationsMap.set(id, { id: doc.id, ...doc.data() });
        }
      }
    } else {
      const supabase = getSupabase();
      const { data: gens } = await supabase
        .from('generations')
        .select('*')
        .in('id', genIds);
      if (gens) {
        for (const gen of gens) {
          generationsMap.set(gen.id, gen);
        }
      }
    }
  }

  // Map favorites to results using pre-fetched generations
  const result = favorites.map((fav: any) => {
    const gen = generationsMap.get(fav.generationId);
    if (!gen) return null;
    const images: string[] = Array.isArray(gen.images) ? gen.images : [];
    const url = images[fav.imageIndex];
    if (!url) return null;
    return {
      id: fav.id,
      generationId: fav.generationId,
      imageIndex: fav.imageIndex,
      url,
      scene: gen.scene,
      createdAt: fav.createdAt || gen.createdAt,
    };
  });

  return c.json(result.filter(Boolean));
});

router.post('/toggle', zValidator('json', z.object({
  generationId: z.string(),
  imageIndex: z.number().int().min(0),
  favorited: z.boolean(),
})), async (c) => {
  const userId = c.get('userId');
  const { generationId, imageIndex, favorited } = c.req.valid('json');

  if (favorited) {
    await addFeedback({ userId, generationId, imageIndex, action: 'favorite' });

    // Upload image to storage
    const gen = await findGenerationById(generationId);
    if (gen) {
      const images: string[] = Array.isArray(gen.images) ? gen.images : [];
      const img = images[imageIndex];
      if (img && !img.startsWith('http')) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const url = await uploadImage(userId, generationId, imageIndex, match[2], match[1]);
          if (url && images[imageIndex] !== url) {
            images[imageIndex] = url;
            await updateGeneration(generationId, { images });
          }
        }
      }
    }
  } else {
    await removeFavorite(userId, generationId, imageIndex);
  }

  return c.json({ favorited });
});

export default router;
