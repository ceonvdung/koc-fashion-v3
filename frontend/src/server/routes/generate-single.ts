import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { createGeneration, logActivity, findUserById, getSettings, createCommission, getDailyUsage } from '../db';
import { type PartItem } from '../services/gemini';
import { getVariantText } from './gen-utils';
import { createJob } from '../services/job-queue';
import { buildReferences, buildInstructionContract, buildInstructionPrompt, referencesToParts } from '../services/reference-builder';
import { learnInput, hasFace, learnCamera } from '../services/input-learner';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

const imageSchema = z.object({
  data: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
});

const batchSchema = z.object({
  faceRef1: imageSchema,
  outfitRef1: imageSchema.optional(),
  productRef1: imageSchema.optional(),
  sceneRef: imageSchema.optional(),
  sceneLevel1: z.string().optional().default(''),
  sceneLevel2: z.string().optional().default(''),
  sceneLevel3: z.string().optional().default(''),
  productAction1_1: z.string().optional().default(''),
  productAction1_2: z.string().optional().default(''),
  action1: z.string().optional().default(''),
  camera: z.string().optional().default(''),
  ratio: z.string(),
  quantity: z.number().int().min(2).max(10),
});

function buildSinglePrompt(data: z.infer<typeof batchSchema>, faceDescription?: string, dna?: any): { parts: PartItem[]; prompt: string } {
  const references = buildReferences(data, 1);
  const contract = buildInstructionContract(data, 1);
  const instructionPrompt = buildInstructionPrompt(contract, 1, { person1: faceDescription }, dna);
  const parts = referencesToParts(references);
  parts.unshift({ type: 'text', text: instructionPrompt });
  return { parts, prompt: instructionPrompt };
}

router.post('/gen-batch', zValidator('json', batchSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const membershipLevel = c.get('userMembershipLevel');

  const quotaKey = `level${membershipLevel}_daily_quota`;
  const quotaSetting = await getSettings(quotaKey).catch(() => null);
  const dailyLimit = quotaSetting ? parseInt(quotaSetting.value) : -1;
  if (dailyLimit > 0) {
    const today = new Date().toISOString().split('T')[0];
    const usage = await getDailyUsage(userId, today).catch(() => null);
    const used = usage?.count || 0;
    if (used >= dailyLimit) {
      return c.json({ message: `Bạn đã đạt giới hạn ${dailyLimit} ảnh/ngày. Vui lòng quay lại vào ngày mai.` }, 429);
    }
  }

  if (data.faceRef1) learnInput(userId, 'face_1', data.faceRef1.data);
  if (data.outfitRef1) learnInput(userId, 'outfit_1', data.outfitRef1.data);
  if (data.productRef1) learnInput(userId, 'product_1', data.productRef1.data);
  if (data.sceneRef) learnInput(userId, 'scene', data.sceneRef.data);
  if (data.camera) learnCamera(userId, data.camera);

  if (!hasFace(userId, 1)) {
    return c.json({ message: 'Vui lòng tải ảnh khuôn mặt hợp lệ' }, 400);
  }

  const context = buildSinglePrompt(data);

  let generation;
  try {
    generation = await createGeneration({
      userId,
      prompt: context.prompt,
      scene: '',
      camera: data.camera || '',
      ratio: data.ratio,
      quantity: data.quantity,
      characterCount: 1,
      status: 'processing',
      images: [],
      metadata: { progress: 'Đang tạo ảnh...' },
    });

    const user = await findUserById(userId).catch(() => null);
    if (user?.referredBy) {
      const directSetting = await getSettings('affiliate_direct_percent').catch(() => null);
      const rate = directSetting ? parseInt(directSetting.value) : 10;
      const amount = (data.quantity * rate) / 100;
      if (amount > 0) {
        await createCommission(user.referredBy, generation.id, user.name || user.email, 1, amount).catch(() => {});
      }
    }

    await logActivity(userId, 'generate_single', `Started batch #${generation.id} — ${data.quantity} images`);
  } catch (e: any) {
    console.error('[gen-batch] DB Init failed:', e);
    return c.json({ message: 'Lỗi khởi tạo dữ liệu: ' + (e?.message || 'Unknown error') }, 500);
  }

  const allVariantParts: PartItem[][] = [];
  for (let idx = 0; idx < data.quantity; idx++) {
    const variantParts = [...context.parts];
    if (idx > 0) {
      variantParts.push({ type: 'text' as const, text: `Variant ${idx + 1}: ${getVariantText(idx, 1)}` });
    }
    allVariantParts.push(variantParts);
  }

  createJob(generation.id, userId, allVariantParts, data.ratio, data);

  runBackgroundAnalysis(userId, data).catch(() => {});

  return c.json({
    generationId: generation.id,
    total: data.quantity,
  });
});

async function runBackgroundAnalysis(userId: string, data: any): Promise<void> {
  const tasks: Promise<any>[] = [];

  const { learnInputWithAnalysis } = await import('../services/input-learner-server');
  if (data.faceRef1) {
    tasks.push(learnInputWithAnalysis(userId, 'face_1', data.faceRef1.data));
    tasks.push((async () => {
      const { analyzeFace, buildFaceDescription } = await import('../services/faceAnalyzer');
      const analysis = await analyzeFace(data.faceRef1.data, data.faceRef1.type || 'image/jpeg').catch(() => null);
      if (analysis) buildFaceDescription(analysis);
    })());
    if (!data.outfitRef1) {
      tasks.push((async () => {
        const { analyzeImage } = await import('../services/gemini');
        await analyzeImage(data.faceRef1.data, data.faceRef1.type || 'image/jpeg', 'outfit').catch(() => {});
      })());
    }
  }
  if (data.outfitRef1) tasks.push(learnInputWithAnalysis(userId, 'outfit_1', data.outfitRef1.data));
  if (data.productRef1) tasks.push(learnInputWithAnalysis(userId, 'product_1', data.productRef1.data));
  if (data.sceneRef) tasks.push(learnInputWithAnalysis(userId, 'scene', data.sceneRef.data));

  tasks.push((async () => {
    const { loadUserDNA } = await import('../services/preferenceEngine');
    await loadUserDNA(userId).catch(() => {});
  })());

  await Promise.allSettled(tasks);
}

export default router;
