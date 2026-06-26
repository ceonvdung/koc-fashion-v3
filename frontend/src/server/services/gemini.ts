export interface AnalysisResult {
  gender?: string;
  ageRange?: string;
  hairStyle?: string;
  skinTone?: string;
  expression?: string;
  outfitType?: string;
  outfitColors?: string;
  outfitMaterial?: string;
  outfitStyle?: string;
  productType?: string;
  productColor?: string;
  productShape?: string;
  productDesign?: string;
  productLogo?: string;
  productPackaging?: string;
  settingType?: string;
  lighting?: string;
  mood?: string;
  backgroundDetails?: string;
  keyElements?: string;
}

import { createSign } from 'node:crypto';
import { getEnv } from '../lib/env';
import fs from 'node:fs';
import path from 'node:path';

const REGION = 'us-central1';
export const MODELS = {
  PRO: 'gemini-2.5-pro',
  FLASH: 'gemini-2.5-flash',
  IMAGEN: 'gemini-2.5-flash-image'
};

const CIRCUIT_BREAKER_THRESHOLD = 10;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  circuitOpenUntil: number;
}

const circuitBreakers: Record<string, CircuitBreakerState> = {};

function getBreaker(modelType: 'pro' | 'imagen'): CircuitBreakerState {
  if (!circuitBreakers[modelType]) {
    circuitBreakers[modelType] = { failureCount: 0, lastFailureTime: 0, circuitOpenUntil: 0 };
  }
  return circuitBreakers[modelType];
}

function isCircuitOpen(modelType: 'pro' | 'imagen'): boolean {
  const cb = getBreaker(modelType);
  if (cb.circuitOpenUntil === 0) return false;
  if (Date.now() > cb.circuitOpenUntil) {
    cb.circuitOpenUntil = 0;
    cb.failureCount = 0;
    return false;
  }
  return true;
}

function recordFailure(modelType: 'pro' | 'imagen'): void {
  const cb = getBreaker(modelType);
  cb.failureCount++;
  cb.lastFailureTime = Date.now();
  if (cb.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    cb.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
    console.warn(`[CircuitBreaker/${modelType}] OPENED — ${cb.failureCount} failures, pausing ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`);
  }
}

function recordSuccess(modelType: 'pro' | 'imagen'): void {
  getBreaker(modelType).failureCount = 0;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function getGeminiApiKey(): string {
  const key = getEnv('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY environment variable not set.');
  return key;
}

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

export function getServiceAccount(): ServiceAccount | null {
  let json = getEnv('GCP_SERVICE_ACCOUNT_JSON');
  if (!json) {
    const keyEnv = getEnv('GEMINI_API_KEY');
    if (keyEnv && keyEnv.endsWith('.json')) {
      try {
        const fullPath = path.resolve(process.cwd(), keyEnv);
        json = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
        console.error('[gemini] Fallback to key.json failed:', e);
      }
    }
  }
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    if (p.client_email && p.private_key && p.project_id) {
      return { clientEmail: p.client_email, privateKey: p.private_key, projectId: p.project_id };
    }
  } catch { console.warn('[Gemini] Failed to parse service account JSON'); }
  return null;
}

function encodeBase64Url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getOAuthToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const header = encodeBase64Url({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeBase64Url({
    iss: sa.clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
  });
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.privateKey, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const assertion = `${header}.${payload}.${sig}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) throw new Error(`OAuth2 token exchange failed: ${res.status}`);
  const data = (await res.json()) as any;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export function getModelUrl(modelId: string): string {
  const sa = getServiceAccount();
  if (sa) {
    return `https://${REGION}-aiplatform.googleapis.com/v1/projects/${sa.projectId}/locations/${REGION}/publishers/google/models/${modelId}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

export async function fetchWithBackoff(url: string, body: any, retries = 5): Promise<Response> {
  if (isCircuitOpen('pro')) {
    throw new Error('AI_PROVIDER_PAUSED');
  }

  const sa = getServiceAccount();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sa) {
    headers['Authorization'] = `Bearer ${await getOAuthToken(sa)}`;
  } else {
    headers['x-goog-api-key'] = getGeminiApiKey();
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (response.ok) {
      recordSuccess('pro');
      return response;
    }

    if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[fetchWithBackoff] Attempt ${attempt + 1} failed (${response.status}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    recordFailure('pro');
    return response;
  }

  throw new Error('Unreachable');
}

export async function fetchWithCircuitBreaker(url: string, body: any, retries = 4): Promise<Response> {
  if (isCircuitOpen('imagen')) {
    throw new Error('AI_PROVIDER_PAUSED');
  }

  const sa = getServiceAccount();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sa) {
    headers['Authorization'] = `Bearer ${await getOAuthToken(sa)}`;
  } else {
    headers['x-goog-api-key'] = getGeminiApiKey();
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (response.ok) {
      recordSuccess('imagen');
      return response;
    }

    if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.warn(`[fetchWithCircuitBreaker] Attempt ${attempt + 1} failed (${response.status}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    recordFailure('imagen');
    const errText = await response.text().catch(() => '');
    throw new Error(`AI_PROVIDER_ERROR_${response.status}: ${errText.substring(0, 200)}`);
  }

  throw new Error('Unreachable');
}

export async function analyzeImage(
  base64Image: string,
  mimeType: string,
  analysisType: 'face' | 'outfit' | 'product' | 'scene'
): Promise<AnalysisResult> {
  let prompt = '';
  switch (analysisType) {
    case 'face':
      prompt = `Analyze this person's appearance in detail for AI fashion photography.
Extract: gender, age range (e.g., "25-35"), hair style, skin tone, facial expression/mood.
Return ONLY valid JSON with keys: gender, ageRange, hairStyle, skinTone, expression.`;
      break;
    case 'outfit':
      prompt = `Analyze this outfit/clothing item in detail for AI fashion photography.
Extract: clothing type (e.g., "blazer", "dress"), main colors, material/fabric, style (e.g., "formal", "casual", "luxury").
Return ONLY valid JSON with keys: outfitType, outfitColors, outfitMaterial, outfitStyle.`;
      break;
    case 'product':
      prompt = `Analyze this product in detail for AI commercial photography.
Extract: product type, main color, shape/form, design features, any visible logo/branding, packaging style.
Return ONLY valid JSON with keys: productType, productColor, productShape, productDesign, productLogo, productPackaging.`;
      break;
    case 'scene':
      prompt = `Analyze this background/scene image in detail for AI photography.
Extract: setting type (e.g., "indoor studio", "city street", "nature park", "beach"), lighting description, mood/atmosphere, background details, key visual elements.
Return ONLY valid JSON with keys: settingType, lighting, mood, backgroundDetails, keyElements.`;
      break;
  }

  const url = getModelUrl(MODELS.PRO);
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  };

  const response = await fetchWithBackoff(url, body);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} ${err}`);
  }

  const result = await response.json() as any;
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

async function parseGeminiResponse(response: Response): Promise<GeneratedImage[]> {
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini generation failed: ${response.status} ${err}`);
  }

  const result = await response.json() as any;
  const candidates = result?.candidates || [];
  const images: GeneratedImage[] = [];
  let allText = '';

  for (const candidate of candidates) {
    const partsOut = candidate?.content?.parts || [];
    for (const part of partsOut) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        if (part.inlineData.data.length > 500) {
          images.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType });
        }
      }
      if (part.text) allText += part.text + ' ';
    }
  }

  if (images.length === 0) {
    throw new Error(`No image generated. Model response: ${allText.slice(0, 300)}`);
  }

  return images;
}

export async function generateImage(
  prompt: string,
  referenceImages?: { base64: string; mimeType: string }[],
  ratio?: string,
  expectedCount?: number,
  retries = 2
): Promise<GeneratedImage[]> {
  const url = getModelUrl(MODELS.IMAGEN);

  const parts: any[] = [{ text: prompt }];
  if (referenceImages) {
    for (const img of referenceImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }

  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 20,
      candidateCount: 1,
      maxOutputTokens: 8192,
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  if (ratio) {
    body.generationConfig.image_config = { aspect_ratio: ratio };
  }

  const response = await fetchWithCircuitBreaker(url, body);

  return parseGeminiResponse(response);
}

export async function generateImageWithLabels(
  basePrompt: string,
  labeledRefs: { label: string; base64: string; mimeType: string }[],
  ratio?: string
): Promise<GeneratedImage[]> {
  const url = getModelUrl(MODELS.IMAGEN);

  const parts: any[] = [{ text: basePrompt }];

  for (const ref of labeledRefs) {
    parts.push({ text: `---REFERENCE IMAGE: ${ref.label}---` });
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
  }

  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 20,
      candidateCount: 1,
      maxOutputTokens: 8192,
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  if (ratio) {
    body.generationConfig.image_config = { aspect_ratio: ratio };
  }

  const response = await fetchWithCircuitBreaker(url, body);

  return parseGeminiResponse(response);
}

export interface PartItem {
  type: 'text' | 'image';
  text?: string;
  base64?: string;
  mimeType?: string;
}

export async function generateImageStructured(
  parts: PartItem[],
  ratio?: string
): Promise<GeneratedImage[]> {
  const url = getModelUrl(MODELS.IMAGEN);


  const apiParts: any[] = parts.map(p => {
    if (p.type === 'text') return { text: p.text! };
    return { inlineData: { mimeType: p.mimeType!, data: p.base64! } };
  });

  const body: any = {
    contents: [{ role: 'user', parts: apiParts }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 20,
      candidateCount: 1,
      maxOutputTokens: 8192,
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  if (ratio) {
    body.generationConfig.image_config = { aspect_ratio: ratio };
  }

  const response = await fetchWithCircuitBreaker(url, body);

  return parseGeminiResponse(response);
}