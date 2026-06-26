import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { analyzeFace, type FaceAnalysis, buildFaceDescription } from '../services/faceAnalyzer';
import { loadUserDNA } from '../services/preferenceEngine';
import { buildSingleContext, buildTwoContext } from '../services/context-builder';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

const debugSchema = z.object({
  faceRef1: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  outfitRef1: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  productRef1: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  faceRef2: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  outfitRef2: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  productRef2: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  sceneRef: z.object({ data: z.string(), type: z.string().optional() }).optional(),
  sceneLevel1: z.string().optional().default(''),
  sceneLevel2: z.string().optional().default(''),
  sceneLevel3: z.string().optional().default(''),
  productAction1_1: z.string().optional().default(''),
  productAction1_2: z.string().optional().default(''),
  productAction2_1: z.string().optional().default(''),
  productAction2_2: z.string().optional().default(''),
  action1: z.string().optional().default(''),
  action2: z.string().optional().default(''),
  interaction_1: z.string().optional().default(''),
  interaction_2: z.string().optional().default(''),
  interaction: z.string().optional().default(''),
  camera: z.string().optional().default(''),
  ratio: z.string().optional().default('1:1'),
  quantity: z.number().int().min(1).max(2).optional().default(2),
});

async function analyzeFaceSafe(ref: { data: string; type?: string } | undefined): Promise<FaceAnalysis | null> {
  if (!ref) return null;
  try {
    return await analyzeFace(ref.data, ref.type || 'image/jpeg');
  } catch {
    return null;
  }
}

router.post('/single/normalize', zValidator('json', debugSchema), async (c) => {
  const data = c.req.valid('json');
  if (!data.faceRef1) {
    return c.json({ errors: ['faceRef1 is required'] }, 400);
  }
  const faceAnalysis = await analyzeFaceSafe(data.faceRef1);
  const context = buildSingleContext({
    faceRef1: { data: data.faceRef1.data, type: data.faceRef1.type || 'image/jpeg' },
    faceAnalysis1: faceAnalysis,
    outfitRef1: data.outfitRef1 ? { data: data.outfitRef1.data, type: data.outfitRef1.type || 'image/jpeg' } : undefined,
    productRef1: data.productRef1 ? { data: data.productRef1.data, type: data.productRef1.type || 'image/jpeg' } : undefined,
    sceneRef: data.sceneRef ? { data: data.sceneRef.data, type: data.sceneRef.type || 'image/jpeg' } : undefined,
    sceneLevel1: data.sceneLevel1,
    sceneLevel2: data.sceneLevel2,
    sceneLevel3: data.sceneLevel3,
    productAction1_1: data.productAction1_1,
    productAction1_2: data.productAction1_2,
    action1: data.action1,
    camera: data.camera,
    ratio: data.ratio,
    quantity: data.quantity,
  });
  return c.json({
    prompt: context.prompt,
    resolvedScene: context.resolvedScene,
    resolvedAction: context.resolvedAction,
    partsCount: context.parts.length,
  });
});

router.post('/single/build-prompt', zValidator('json', debugSchema), async (c) => {
  const data = c.req.valid('json');
  if (!data.faceRef1) {
    return c.json({ errors: ['faceRef1 is required'] }, 400);
  }
  const userId = c.get('userId');
  const dna = await loadUserDNA(userId);
  const faceAnalysis = await analyzeFaceSafe(data.faceRef1);
  const context = buildSingleContext({
    faceRef1: { data: data.faceRef1.data, type: data.faceRef1.type || 'image/jpeg' },
    faceAnalysis1: faceAnalysis,
    outfitRef1: data.outfitRef1 ? { data: data.outfitRef1.data, type: data.outfitRef1.type || 'image/jpeg' } : undefined,
    productRef1: data.productRef1 ? { data: data.productRef1.data, type: data.productRef1.type || 'image/jpeg' } : undefined,
    sceneRef: data.sceneRef ? { data: data.sceneRef.data, type: data.sceneRef.type || 'image/jpeg' } : undefined,
    sceneLevel1: data.sceneLevel1,
    sceneLevel2: data.sceneLevel2,
    sceneLevel3: data.sceneLevel3,
    productAction1_1: data.productAction1_1,
    productAction1_2: data.productAction1_2,
    action1: data.action1,
    camera: data.camera,
    ratio: data.ratio,
    quantity: data.quantity,
    dna,
  });
  return c.json({
    prompt: context.prompt,
    resolvedScene: context.resolvedScene,
    resolvedAction: context.resolvedAction,
    partsCount: context.parts.length,
  });
});

router.post('/two/normalize', zValidator('json', debugSchema), async (c) => {
  const data = c.req.valid('json');
  if (!data.faceRef1 || !data.faceRef2) {
    return c.json({ errors: ['faceRef1 and faceRef2 are required'] }, 400);
  }
  const context = buildTwoContext({
    faceRef1: { data: data.faceRef1.data, type: data.faceRef1.type || 'image/jpeg' },
    faceRef2: { data: data.faceRef2.data, type: data.faceRef2.type || 'image/jpeg' },
    outfitRef1: data.outfitRef1 ? { data: data.outfitRef1.data, type: data.outfitRef1.type || 'image/jpeg' } : undefined,
    productRef1: data.productRef1 ? { data: data.productRef1.data, type: data.productRef1.type || 'image/jpeg' } : undefined,
    outfitRef2: data.outfitRef2 ? { data: data.outfitRef2.data, type: data.outfitRef2.type || 'image/jpeg' } : undefined,
    productRef2: data.productRef2 ? { data: data.productRef2.data, type: data.productRef2.type || 'image/jpeg' } : undefined,
    sceneRef: data.sceneRef ? { data: data.sceneRef.data, type: data.sceneRef.type || 'image/jpeg' } : undefined,
    sceneLevel1: data.sceneLevel1,
    sceneLevel2: data.sceneLevel2,
    sceneLevel3: data.sceneLevel3,
    productAction1_1: data.productAction1_1,
    productAction1_2: data.productAction1_2,
    productAction2_1: data.productAction2_1,
    productAction2_2: data.productAction2_2,
    action1: data.action1,
    action2: data.action2,
    interaction: data.interaction,
    interaction_1: data.interaction_1,
    interaction_2: data.interaction_2,
    camera: data.camera,
    ratio: data.ratio,
    quantity: data.quantity,
  });
  return c.json({
    prompt: context.prompt,
    resolvedScene: context.resolvedScene,
    resolvedAction: context.resolvedAction,
    resolvedInteraction: context.resolvedInteraction,
    partsCount: context.parts.length,
  });
});

router.post('/two/build-prompt', zValidator('json', debugSchema), async (c) => {
  const data = c.req.valid('json');
  if (!data.faceRef1 || !data.faceRef2) {
    return c.json({ errors: ['faceRef1 and faceRef2 are required'] }, 400);
  }
  const userId = c.get('userId');
  const dna = await loadUserDNA(userId);
  const context = buildTwoContext({
    faceRef1: { data: data.faceRef1.data, type: data.faceRef1.type || 'image/jpeg' },
    faceRef2: { data: data.faceRef2.data, type: data.faceRef2.type || 'image/jpeg' },
    outfitRef1: data.outfitRef1 ? { data: data.outfitRef1.data, type: data.outfitRef1.type || 'image/jpeg' } : undefined,
    productRef1: data.productRef1 ? { data: data.productRef1.data, type: data.productRef1.type || 'image/jpeg' } : undefined,
    outfitRef2: data.outfitRef2 ? { data: data.outfitRef2.data, type: data.outfitRef2.type || 'image/jpeg' } : undefined,
    productRef2: data.productRef2 ? { data: data.productRef2.data, type: data.productRef2.type || 'image/jpeg' } : undefined,
    sceneRef: data.sceneRef ? { data: data.sceneRef.data, type: data.sceneRef.type || 'image/jpeg' } : undefined,
    sceneLevel1: data.sceneLevel1,
    sceneLevel2: data.sceneLevel2,
    sceneLevel3: data.sceneLevel3,
    productAction1_1: data.productAction1_1,
    productAction1_2: data.productAction1_2,
    productAction2_1: data.productAction2_1,
    productAction2_2: data.productAction2_2,
    action1: data.action1,
    action2: data.action2,
    interaction: data.interaction,
    interaction_1: data.interaction_1,
    interaction_2: data.interaction_2,
    camera: data.camera,
    ratio: data.ratio,
    quantity: data.quantity,
    dna,
  });
  return c.json({
    prompt: context.prompt,
    resolvedScene: context.resolvedScene,
    resolvedAction: context.resolvedAction,
    resolvedInteraction: context.resolvedInteraction,
    partsCount: context.parts.length,
  });
});

export default router;
