import type { PartItem } from './gemini';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

function userMessage(msg: string): string {
  if (msg.startsWith('AI_PROVIDER_PAUSED')) return 'Hệ thống AI đang quá tải, đang chờ xử lý lại...';
  if (msg.startsWith('AI_PROVIDER_ERROR_429')) return 'Hệ thống AI đang bận, đang thử lại...';
  if (msg.startsWith('AI_PROVIDER_ERROR_')) return 'Lỗi hệ thống AI, đang thử lại...';
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) return 'Mất kết nối hệ thống AI, đang thử lại...';
  return 'Đang xử lý...';
}

export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  variantPartsList: PartItem[][];
  ratio?: string;
  totalSlots: number;
  completedSlots: number;
  images: string[];
  statusText: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  inputData?: any;
  retryCount: number[];
}

const MAX_CONCURRENT = 2;
const MAX_QA_RETRIES = 1;
const JOB_CLEANUP_AGE = 30 * 60 * 1000;

const jobs = new Map<string, Job>();
const pendingQueue: string[] = [];
const userActivity = new Map<string, number>();
let activeCount = 0;
let processing = false;
let lastUserId = '';

const sseClients = new Map<string, Set<(data: string) => void>>();

setInterval(() => {
  const cutoff = Date.now() - JOB_CLEANUP_AGE;
  for (const [id, job] of jobs) {
    if ((job.status === 'completed' || job.status === 'failed') && (job.completedAt || 0) < cutoff) {
      jobs.delete(id);
      sseClients.delete(id);
    }
  }
}, 60_000);

export function subscribeToJob(jobId: string, callback: (data: string) => void): () => void {
  if (!sseClients.has(jobId)) sseClients.set(jobId, new Set());
  sseClients.get(jobId)!.add(callback);
  return () => sseClients.get(jobId)?.delete(callback);
}

function notifyJob(jobId: string, data: any): void {
  const clients = sseClients.get(jobId);
  if (clients) {
    const msg = JSON.stringify(data);
    for (const cb of clients) cb(msg);
  }
}

export function createJob(id: string, userId: string, variantPartsList: PartItem[][], ratio?: string, inputData?: any): void {
  jobs.set(id, {
    id,
    userId,
    status: 'pending',
    variantPartsList,
    ratio,
    totalSlots: variantPartsList.length,
    completedSlots: 0,
    images: [],
    statusText: 'Preparing references...',
    createdAt: Date.now(),
    inputData,
    retryCount: [],
  });
  pendingQueue.push(id);
  notifyJob(id, { type: 'status', status: 'pending', statusText: 'Preparing references...' });
  processQueue();
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateUserActivity(userId: string): void {
  userActivity.set(userId, Date.now());
}

function pickNextJob(): string | undefined {
  let firstActiveIdx = -1;
  let rrIdx = -1;

  for (let i = pendingQueue.length - 1; i >= 0; i--) {
    const job = jobs.get(pendingQueue[i]);
    if (!job) {
      pendingQueue.splice(i, 1);
      continue;
    }

    firstActiveIdx = i;
    if (job.userId !== lastUserId) rrIdx = i;
  }

  const pickIdx = rrIdx >= 0 ? rrIdx : firstActiveIdx;
  if (pickIdx < 0) return undefined;

  const jobId = pendingQueue.splice(pickIdx, 1)[0];
  const job = jobs.get(jobId);
  if (job) lastUserId = job.userId;
  return jobId;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (activeCount < MAX_CONCURRENT) {
    const jobId = pickNextJob();
    if (!jobId) break;

    const job = jobs.get(jobId);
    if (!job || job.status !== 'pending') continue;

    activeCount++;
    job.status = 'processing';
    job.startedAt = Date.now();
    job.statusText = 'Generating image...';
    notifyJob(jobId, { type: 'status', status: 'processing', statusText: 'Generating image...' });

    processJob(job).finally(() => {
      activeCount--;
      processQueue();
    });
  }

  processing = false;
}

async function processOneSlot(job: Job, idx: number): Promise<any> {
  const { generateImageStructured } = await import('./gemini');

  const variantParts = job.variantPartsList[idx];
  let attempts = 0;
  const MAX_RETRIES = 2;

  while (attempts <= MAX_RETRIES) {
    try {
      const images = await generateImageStructured(variantParts, job.ratio);
      if (images.length === 0) throw new Error('No image generated');

      job.images.push(`data:${images[0].mimeType};base64,${images[0].base64}`);
      return images[0];
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.startsWith('AI_PROVIDER_PAUSED')) {
        pendingQueue.push(job.id);
        job.statusText = userMessage(msg);
        notifyJob(job.id, { type: 'status', statusText: job.statusText });
        await new Promise(r => setTimeout(r, 5000));
        throw e;
      }
      if (msg.startsWith('AI_PROVIDER_ERROR_') || msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
        job.statusText = userMessage(msg);
        notifyJob(job.id, { type: 'status', statusText: job.statusText });
        if (attempts < MAX_RETRIES) { attempts++; continue; }
        throw e;
      }
      if (attempts < MAX_RETRIES) { attempts++; continue; }
      throw e;
    }
  }
}

async function processJob(job: Job): Promise<void> {
  const { updateGeneration } = await import('../db');

  const idx = job.completedSlots;

  try {
    const generatedImage = await processOneSlot(job, idx);

    job.completedSlots++;
    job.statusText = `Generating ${job.completedSlots}/${job.totalSlots}...`;
    notifyJob(job.id, { type: 'image', index: idx, total: job.totalSlots, count: job.completedSlots });

    const newStatus = job.completedSlots >= job.totalSlots ? 'completed' : 'processing';

    await updateGeneration(job.id, {
      images: [...job.images],
      status: newStatus,
      metadata: { progress: `Đã tạo ${job.completedSlots}/${job.totalSlots} ảnh` },
    }).catch(() => {});

    // QA in background — user sees image immediately
    if (job.inputData && generatedImage) {
      scheduleQA(job, idx, generatedImage).catch(() => {});
    }

    if (job.completedSlots >= job.totalSlots) {
      job.status = 'completed';
      job.completedAt = Date.now();
      job.statusText = 'Completed';
      notifyJob(job.id, { type: 'done', status: 'completed', images: [...job.images] });

      await updateGeneration(job.id, {
        images: [...job.images],
        status: 'completed',
        metadata: { progress: 'Hoàn thành' },
      }).catch(() => {});

      // Upload images to Supabase Storage (background, non-blocking) — skip when local-dev
      uploadJobImages(job).catch(() => {});

      sseClients.delete(job.id);
    } else {
      job.status = 'pending';
      job.statusText = `Chờ xử lý slot ${job.completedSlots + 1}/${job.totalSlots}`;
      pendingQueue.push(job.id);
      notifyJob(job.id, { type: 'status', status: 'pending', statusText: job.statusText });
    }
  } catch (e: any) {
    const msg = e?.message || '';
    if (msg.startsWith('AI_PROVIDER_PAUSED')) return;

    job.status = 'failed';
    job.completedAt = Date.now();
    job.error = msg;
    job.statusText = 'Thất bại';
    notifyJob(job.id, { type: 'error', status: 'failed', error: job.error });

    await updateGeneration(job.id, {
      status: 'failed',
      metadata: { progress: 'Failed', error: job.error },
    }).catch(() => {});

    sseClients.delete(job.id);
  }
}

async function uploadJobImages(job: Job): Promise<void> {
  try {
    const { isLocalDev } = await import('../db');
    if (isLocalDev()) return;

    const { uploadImage } = await import('./storage');
    const { updateGeneration } = await import('../db');

    let hasUpdate = false;
    for (let i = 0; i < job.images.length; i++) {
      const img = job.images[i];
      if (img && !img.startsWith('http')) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const url = await uploadImage(job.userId, job.id, i, match[2], match[1]);
          if (url && job.images[i] !== url) {
            job.images[i] = url;
            hasUpdate = true;
          }
        }
      }
    }
    if (hasUpdate) {
      await updateGeneration(job.id, { images: [...job.images] }).catch(() => {});
    }
  } catch { console.warn('[JobQueue] Upload images failed'); }
}

async function scheduleQA(job: Job, idx: number, generatedImage: any): Promise<void> {
  try {
    const { runOutputQA } = await import('./output-qa');
    const { updateGeneration } = await import('../db');
    const { generateImageStructured } = await import('./gemini');

    const slotRetries = job.retryCount[idx] || 0;
    const personCount = job.inputData.faceRef2 ? 2 : 1;
    const qaResult = await runOutputQA(generatedImage, job.inputData, personCount);

    if (!qaResult.pass) {
      console.warn(`[QA] Slot ${idx} failed (attempt ${slotRetries + 1}): face=${qaResult.face.pass} outfit=${qaResult.outfit.pass}`);

      if (slotRetries >= MAX_QA_RETRIES) {
        job.images[idx] = `ERROR_SLOT:${idx}`;
        await updateGeneration(job.id, {
          images: [...job.images],
          metadata: { ...job.inputData?.metadata, errorSlot: idx, errorReason: qaResult.overallReason },
        }).catch(() => {});
        return;
      }

      job.retryCount[idx] = slotRetries + 1;
      const variantParts = job.variantPartsList[idx];
      const retryImages = await generateImageStructured(variantParts, job.ratio);
      if (retryImages.length > 0) {
        const newData = `data:${retryImages[0].mimeType};base64,${retryImages[0].base64}`;
        job.images[idx] = newData;
        await updateGeneration(job.id, { images: [...job.images] }).catch(() => {});
      }
    }
  } catch (e) {
    console.error(`[QA] Background QA failed for slot ${idx}:`, e);
  }
}