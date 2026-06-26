import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { createGeneration, logActivity, findUserById, getSettings, createCommission, getDailyUsage } from '../db';
import { analyzeImage, type PartItem } from '../services/gemini';
import { getVariantText } from './gen-utils';
import { createJob } from '../services/job-queue';
import { buildReferences, buildInstructionContract, buildInstructionPrompt, referencesToParts } from '../services/reference-builder';
import { hasFace, learnCamera } from '../services/input-learner';
import { learnInputWithAnalysis as learnInput } from '../services/input-learner-server';
import { analyzeFace, buildFaceDescription } from '../services/faceAnalyzer';

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
  faceRef2: imageSchema,
  outfitRef2: imageSchema.optional(),
  productRef2: imageSchema.optional(),
  sceneRef: imageSchema.optional(),
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
  ratio: z.string(),
  quantity: z.number().int().min(2).max(10),
});

function buildTwoPrompt(data: z.infer<typeof batchSchema>, faceDescriptions?: { person1?: string; person2?: string }, dna?: any, productDescriptions?: { person1?: string; person2?: string }, sceneDescription?: string): { parts: PartItem[]; prompt: string } {
  const references = buildReferences(data, 2);
  const contract = buildInstructionContract(data, 2);
  const instructionPrompt = buildInstructionPrompt(contract, 2, faceDescriptions, dna, productDescriptions, sceneDescription);
  const parts = referencesToParts(references);
  parts.unshift({ type: 'text', text: instructionPrompt });
  return { parts, prompt: instructionPrompt };
}

function formatProductText(result: any): string {
  return [result.productType, result.productColor, result.productShape, result.productDesign, result.productLogo ? `logo: ${result.productLogo}` : ''].filter(Boolean).join(', ');
}

function formatSceneText(result: any): string {
  return [result.settingType, result.lighting, result.mood, result.backgroundDetails, result.keyElements].filter(Boolean).join(', ');
}

router.post('/gen-batch', zValidator('json', batchSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const membershipLevel = c.get('userMembershipLevel');

  if (membershipLevel < 2) {
    return c.json({ message: 'Two-character generation requires membership level 2.' }, 403);
  }

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

  const learnPromises: Promise<any>[] = [];
  if (data.faceRef1) learnPromises.push(learnInput(userId, 'face_1', data.faceRef1.data));
  if (data.faceRef2) learnPromises.push(learnInput(userId, 'face_2', data.faceRef2.data));
  if (data.outfitRef1) learnPromises.push(learnInput(userId, 'outfit_1', data.outfitRef1.data));
  if (data.outfitRef2) learnPromises.push(learnInput(userId, 'outfit_2', data.outfitRef2.data));
  if (data.productRef1) learnPromises.push(learnInput(userId, 'product_1', data.productRef1.data));
  if (data.productRef2) learnPromises.push(learnInput(userId, 'product_2', data.productRef2.data));
  if (data.sceneRef) learnPromises.push(learnInput(userId, 'scene', data.sceneRef.data));
  if (data.camera) learnCamera(userId, data.camera);
  await Promise.allSettled(learnPromises);

  if (!hasFace(userId, 2)) {
    return c.json({ message: 'Vui lòng tải ảnh khuôn mặt hợp lệ' }, 400);
  }

  const faceDescriptions: { person1?: string; person2?: string } = {};
  const outfitFromFace: { person1?: string; person2?: string } = {};
  const productDescriptions: { person1?: string; person2?: string } = {};
  let sceneDescription: string | undefined;
  const analysisPromises: Promise<void>[] = [];

  if (data.faceRef1) {
    analysisPromises.push(
      analyzeFace(data.faceRef1.data, data.faceRef1.type || 'image/jpeg')
        .then(analysis => { faceDescriptions.person1 = buildFaceDescription(analysis); })
        .catch(() => {})
    );
    if (!data.outfitRef1) {
      analysisPromises.push(
        analyzeImage(data.faceRef1!.data, data.faceRef1!.type || 'image/jpeg', 'outfit')
        .then(result => {
          if (result.outfitType) outfitFromFace.person1 = `Person1 wears ${result.outfitType}, ${result.outfitColors || ''}, ${result.outfitMaterial || ''}, ${result.outfitStyle || ''}`.replace(/\s+/g, ' ').trim();
        }).catch(() => {})
      );
    }
  }
  if (data.faceRef2) {
    analysisPromises.push(
      analyzeFace(data.faceRef2.data, data.faceRef2.type || 'image/jpeg')
        .then(analysis => { faceDescriptions.person2 = buildFaceDescription(analysis); })
        .catch(() => {})
    );
    if (!data.outfitRef2) {
      analysisPromises.push(
        analyzeImage(data.faceRef2!.data, data.faceRef2!.type || 'image/jpeg', 'outfit')
        .then(result => {
          if (result.outfitType) outfitFromFace.person2 = `Person2 wears ${result.outfitType}, ${result.outfitColors || ''}, ${result.outfitMaterial || ''}, ${result.outfitStyle || ''}`.replace(/\s+/g, ' ').trim();
        }).catch(() => {})
      );
    }
  }

  if (data.productRef1) {
    analysisPromises.push(
      analyzeImage(data.productRef1.data, data.productRef1.type || 'image/jpeg', 'product')
        .then(result => { productDescriptions.person1 = formatProductText(result); })
        .catch(() => {})
    );
  }
  if (data.productRef2) {
    analysisPromises.push(
      analyzeImage(data.productRef2.data, data.productRef2.type || 'image/jpeg', 'product')
        .then(result => { productDescriptions.person2 = formatProductText(result); })
        .catch(() => {})
    );
  }

  if (data.sceneRef) {
    analysisPromises.push(
      analyzeImage(data.sceneRef.data, data.sceneRef.type || 'image/jpeg', 'scene')
        .then(result => { sceneDescription = formatSceneText(result); })
        .catch(() => {})
    );
  }

  await Promise.allSettled(analysisPromises);

  if (outfitFromFace.person1) {
    (data as any)._outfitFromFace1 = outfitFromFace.person1;
  }
  if (outfitFromFace.person2) {
    (data as any)._outfitFromFace2 = outfitFromFace.person2;
  }

  let dna: any;
  try {
    const { loadUserDNA } = await import('../services/preferenceEngine');
    dna = await loadUserDNA(userId);
  } catch { console.warn('[GenBatch] Failed to load user DNA, continuing without'); }

  const context = buildTwoPrompt(data, faceDescriptions, dna, productDescriptions, sceneDescription);

  let generation;
  try {
    generation = await createGeneration({
      userId,
      prompt: context.prompt,
      scene: '',
      camera: data.camera || '',
      ratio: data.ratio,
      quantity: data.quantity,
      characterCount: 2,
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

    await logActivity(userId, 'generate_two', `Started batch #${generation.id} — ${data.quantity} images`);
  } catch (e: any) {
    console.error('[gen-batch] DB Init failed:', e);
    return c.json({ message: 'Lỗi khởi tạo dữ liệu: ' + (e?.message || 'Unknown error') }, 500);
  }

  const allVariantParts: PartItem[][] = [];
  for (let idx = 0; idx < data.quantity; idx++) {
    const variantParts = [...context.parts];
    if (idx > 0) {
      variantParts.push({ type: 'text' as const, text: `Variant ${idx + 1}: ${getVariantText(idx, 2)}` });
    }
    allVariantParts.push(variantParts);
  }

  createJob(generation.id, userId, allVariantParts, data.ratio, data);

  return c.json({
    generationId: generation.id,
    total: data.quantity,
  });
});

export default router;
