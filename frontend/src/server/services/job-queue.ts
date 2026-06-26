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

const MAX_CONCURRENT = 4;
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
    images: new Array(variantPartsList.length).fill(''),
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
      return images[0];
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.startsWith('AI_PROVIDER_PAUSED')) {
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
  const { updateGeneration, incrementDailyUsage } = await import('../db');
  const failedSlots: number[] = [];

  for (let idx = 0; idx < job.totalSlots; idx++) {
    try {
      const generatedImage = await processOneSlot(job, idx);
      job.images[idx] = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;

      job.completedSlots = idx + 1;
      job.statusText = `Generating ${job.completedSlots}/${job.totalSlots}...`;
      notifyJob(job.id, { type: 'image', index: idx, total: job.totalSlots, count: job.completedSlots });

      await updateGeneration(job.id, {
        images: [...job.images],
        status: 'processing',
        metadata: {
          progress: failedSlots.length > 0
            ? `Đã tạo ${job.completedSlots}/${job.totalSlots} ảnh (${failedSlots.length} lỗi)`
            : `Đã tạo ${job.completedSlots}/${job.totalSlots} ảnh`,
        },
      }).catch(() => {});

      if (job.inputData && generatedImage) {
        runLogOnlyQA(job, idx, generatedImage).catch(() => {});
      }
    } catch (e: any) {
      job.images[idx] = `ERROR_SLOT:${idx}`;
      failedSlots.push(idx);

      job.completedSlots = idx + 1;
      job.statusText = `Slot ${idx + 1} lỗi, tiếp tục...`;
      notifyJob(job.id, { type: 'image', index: idx, total: job.totalSlots, count: job.completedSlots, error: true });

      await updateGeneration(job.id, {
        images: [...job.images],
        status: 'processing',
        metadata: {
          progress: `Đã tạo ${job.completedSlots}/${job.totalSlots} ảnh (${failedSlots.length} lỗi)`,
          errorSlots: failedSlots,
        },
      }).catch(() => {});
    }
  }

  job.status = 'completed';
  job.completedAt = Date.now();
  job.statusText = failedSlots.length > 0
    ? `Hoàn thành (${failedSlots.length}/${job.totalSlots} lỗi)`
    : 'Hoàn thành';

  await uploadJobImages(job);

  await updateGeneration(job.id, {
    images: [...job.images],
    status: 'completed',
    metadata: {
      progress: job.statusText,
      errorSlots: failedSlots.length > 0 ? failedSlots : undefined,
    },
  }).catch(() => {});

  const today = new Date().toISOString().split('T')[0];
  await incrementDailyUsage(job.userId, today).catch(() => {});

  notifyJob(job.id, { type: 'done', status: 'completed', images: [...job.images] });
  sseClients.delete(job.id);
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
      if (img && !img.startsWith('http') && !img.startsWith('ERROR_SLOT:')) {
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

async function runLogOnlyQA(job: Job, idx: number, generatedImage: any): Promise<void> {
  try {
    const { runOutputQA } = await import('./output-qa');
    const personCount = job.inputData.faceRef2 ? 2 : 1;
    const qaResult = await runOutputQA(generatedImage, job.inputData, personCount);
    if (!qaResult.pass) {
      console.warn(`[QA-LOG] Slot ${idx} QA fail: face=${qaResult.face.pass} outfit=${qaResult.outfit.pass} — still showing image`);
    }
  } catch (e) {
    console.error(`[QA-LOG] Slot ${idx} QA error:`, e);
  }
}
