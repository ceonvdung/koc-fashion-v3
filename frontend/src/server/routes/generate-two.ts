import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate } from '../middleware/auth';
import { createGeneration, updateGeneration, logActivity, findUserById, getSettings, createCommission, getDailyUsage, incrementDailyUsage, findGenerationById, listGenerationsByUser, deleteGeneration } from '../db';
import { generateImageStructured, analyzeImage, type PartItem } from '../services/gemini';
import { uploadImage } from '../services/storage';
import { getVariantText } from './gen-utils';
import { createJob } from '../services/job-queue';
import { buildReferences, buildInstructionContract, buildInstructionPrompt, referencesToParts } from '../services/reference-builder';
import { runOutputQA } from '../services/output-qa';
import { hasFace, learnCamera } from '../services/input-learner';
import { learnInputWithAnalysis as learnInput } from '../services/input-learner-server';
import { analyzeFace, buildFaceDescription } from '../services/faceAnalyzer';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate);

// === Schemas ===
const imageSchema = z.object({
  data: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
});

const genSchema = z.object({
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
  index: z.number().int().min(0),
  generationId: z.string().optional(),
});

const saveSchema = z.object({
  generationId: z.string(),
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

// === Helpers ===
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

// === Routes ===

// POST /gen-batch — Create generation, return immediately
router.post('/gen-batch', zValidator('json', batchSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const membershipLevel = c.get('userMembershipLevel');

  if (membershipLevel < 2) {
    return c.json({ message: 'Two-character generation requires membership level 2.' }, 403);
  }

  // Quota check
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

  // Learn + verify inputs
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

  // Analysis phase: face, product, scene — all run in parallel
  const faceDescriptions: { person1?: string; person2?: string } = {};
  const outfitFromFace: { person1?: string; person2?: string } = {};
  const productDescriptions: { person1?: string; person2?: string } = {};
  let sceneDescription: string | undefined;
  const analysisPromises: Promise<void>[] = [];

  // Face analysis + outfit from face
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

  // Product analysis — convert image to text description
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

  // Scene analysis — convert image to text (if no scene text provided)
  if (data.sceneRef) {
    analysisPromises.push(
      analyzeImage(data.sceneRef.data, data.sceneRef.type || 'image/jpeg', 'scene')
        .then(result => { sceneDescription = formatSceneText(result); })
        .catch(() => {})
    );
  }

  await Promise.allSettled(analysisPromises);

  // Inject outfit from face into data before building prompt
  if (outfitFromFace.person1) {
    (data as any)._outfitFromFace1 = outfitFromFace.person1;
  }
  if (outfitFromFace.person2) {
    (data as any)._outfitFromFace2 = outfitFromFace.person2;
  }

  // Load user style DNA
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

    // Affiliate commission
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

  // Build variant parts for job queue
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

// GET /stream/:id — SSE endpoint for streaming images
router.get('/stream/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const role = c.get('userRole');

  const generation = await findGenerationById(id);
  if (!generation) return c.json({ message: 'Generation not found' }, 404);
  if (role !== 'super_admin' && generation.userId !== userId) {
    return c.json({ message: 'Generation not found' }, 404);
  }

  if (generation.status === 'completed') {
    return c.json({ generationId: id, status: 'completed', images: generation.images });
  }

  if (generation.status === 'failed') {
    return c.json({ generationId: id, status: 'failed', error: generation.metadata?.error });
  }

  // Return SSE stream
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastCount = 0;

      // Poll for new images every 1 second
      const interval = setInterval(async () => {
        try {
          const gen = await findGenerationById(id);
          if (!gen || gen.status === 'failed') {
            clearInterval(interval);
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Generation failed' })}\n\n`));
            controller.close();
            return;
          }

          const images: string[] = Array.isArray(gen.images) ? gen.images : [];
          if (images.length > lastCount) {
            // Send new images
            for (let i = lastCount; i < images.length; i++) {
              controller.enqueue(encoder.encode(
                `event: image\ndata: ${JSON.stringify({ index: i, image: images[i] })}\n\n`
              ));
            }
            lastCount = images.length;

            if (gen.status === 'completed') {
              clearInterval(interval);
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
              controller.close();
            }
          }
        } catch (e) {
          console.error('[SSE] Poll error:', e);
        }
      }, 1000);
    },
  });

  return c.body(stream);
});

// POST /gen — Generate 1 image
router.post('/gen', zValidator('json', genSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const role = c.get('userRole');
  const membershipLevel = c.get('userMembershipLevel');
  const isFirst = !data.generationId;

  if (membershipLevel < 2) {
    return c.json({ message: 'Two-character generation requires membership level 2.' }, 403);
  }

  let generation;
  if (!isFirst) {
    generation = await findGenerationById(data.generationId!);
    if (!generation) return c.json({ message: 'Generation not found' }, 404);
    if (role !== 'super_admin' && generation.userId !== userId) {
      return c.json({ message: 'Generation not found' }, 404);
    }
  }

  if (isFirst) {
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
  }

  // Learn + verify inputs
  if (data.faceRef1) learnInput(userId, 'face_1', data.faceRef1.data);
  if (data.faceRef2) learnInput(userId, 'face_2', data.faceRef2.data);
  if (data.outfitRef1) learnInput(userId, 'outfit_1', data.outfitRef1.data);
  if (data.outfitRef2) learnInput(userId, 'outfit_2', data.outfitRef2.data);
  if (data.productRef1) learnInput(userId, 'product_1', data.productRef1.data);
  if (data.productRef2) learnInput(userId, 'product_2', data.productRef2.data);
  if (data.sceneRef) learnInput(userId, 'scene', data.sceneRef.data);
  if (data.camera) learnCamera(userId, data.camera);

  if (!hasFace(userId, 2)) {
    return c.json({ message: 'Vui lòng tải ảnh khuôn mặt hợp lệ' }, 400);
  }

  const context = buildTwoPrompt(data);

  const variantParts = [...context.parts];
  if (data.index > 0) {
    variantParts.push({ type: 'text' as const, text: `Variant ${data.index + 1}: ${getVariantText(data.index, 2)}` });
  }

  let outImages;
  try {
    outImages = await generateImageStructured(variantParts, data.ratio);
  } catch (e: any) {
    const errMsg = e?.message || 'Unknown error';
    console.error('[gen] Gemini failed:', errMsg);
    if (generation) {
      await updateGeneration(generation.id, { status: 'failed', metadata: { progress: 'Failed', error: errMsg } }).catch(() => {});
    }
    return c.json({ message: errMsg }, 500);
  }
  if (!outImages || outImages.length === 0) {
    return c.json({ message: 'Gemini returned no image' }, 500);
  }

  let img = outImages[0];
  let qaPassed = true;
  const qaResult = await runOutputQA(img, data, 2);
  qaPassed = qaResult.pass;
  if (!qaPassed) {
    console.warn(`[gen] QA failed: face=${qaResult.face.pass} outfit=${qaResult.outfit.pass}`);
    for (let r = 0; r < 2 && !qaPassed; r++) {
      const retryImages = await generateImageStructured(variantParts, data.ratio);
      if (retryImages.length === 0) break;
      img = retryImages[0];
      const retryQA = await runOutputQA(img, data, 2);
      qaPassed = retryQA.pass;
      if (!qaPassed) {
        console.warn(`[gen] QA retry ${r + 1} failed`);
      }
    }
  }

  if (isFirst) {
    generation = await createGeneration({
      userId,
      prompt: context.prompt,
      scene: '',
      camera: data.camera || '',
      ratio: data.ratio,
      quantity: data.quantity,
      characterCount: 2,
      status: 'processing',
      metadata: { progress: 'Đã tạo ảnh đầu tiên' },
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

    await logActivity(userId, 'generate_two', `Started #${generation.id} — ${data.quantity} images`);
  }

  // Store image in generation record
  const currentImages = Array.isArray(generation.images) ? [...generation.images] : [];
  currentImages[data.index] = `data:${img.mimeType};base64,${img.base64}`;

  await updateGeneration(generation.id, {
    images: currentImages,
    status: 'processing',
    metadata: { progress: `Đã tạo ${data.index + 1}/${data.quantity} ảnh` },
  });

  return c.json({
    base64: img.base64,
    mimeType: img.mimeType,
    generationId: generation.id,
    index: data.index,
    total: data.quantity,
  });
});

// POST /save — upload all images to Supabase Storage
router.post('/save', zValidator('json', saveSchema), async (c) => {
  const { generationId } = c.req.valid('json');
  const userId = c.get('userId');
  const role = c.get('userRole');

  const generation = await findGenerationById(generationId);
  if (!generation) return c.json({ message: 'Generation not found' }, 404);
  if (role !== 'super_admin' && generation.userId !== userId) {
    return c.json({ message: 'Generation not found' }, 404);
  }
  if (generation.status === 'completed') {
    return c.json({ status: 'completed', images: generation.images });
  }

  const images: string[] = Array.isArray(generation.images) ? generation.images : [];

  const uploadResults = await Promise.allSettled(
    images.map(async (img, i) => {
      if (typeof img !== 'string' || !img) return '';
      if (img.startsWith('http')) return img;
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return img;
      return await uploadImage(userId, generationId, i, match[2], match[1]) || img;
    })
  );

  const imageUrls = uploadResults.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.warn(`Upload failed for image ${i}:`, result.reason);
    return images[i] || '';
  });

  const successfulUploads = uploadResults.filter(r => r.status === 'fulfilled' && r.value.startsWith('http')).length;


  await updateGeneration(generationId, {
    images: imageUrls,
    status: 'completed',
    metadata: { progress: 'Hoàn thành' },
  });

  await logActivity(userId, 'generate_two', `Completed ${imageUrls.length}/${generation.quantity} images for #${generationId}`);

  const today = new Date().toISOString().split('T')[0];
  await incrementDailyUsage(userId, today).catch(() => {});

  return c.json({ status: 'completed', images: imageUrls });
});

export default router;