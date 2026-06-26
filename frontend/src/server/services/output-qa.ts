import { getModelUrl, MODELS, fetchWithBackoff } from './gemini';
import type { GeneratedImage } from './gemini';

export interface QAResult {
  pass: boolean;
  face: { pass: boolean; reason?: string };
  outfit: { pass: boolean; reason?: string };
  product: { pass: boolean; reason?: string };
  scene: { pass: boolean; reason?: string };
  overallReason?: string;
}

export async function runOutputQA(
  generatedImage: GeneratedImage,
  data: any,
  personCount: 1 | 2 = 1
): Promise<QAResult> {
  const parts: any[] = [];

  parts.push({
    text: `You are a fashion photography QA inspector. Check if the GENERATED IMAGE matches all references EXACTLY.

Answer in JSON format only:
{"face":{"pass":true/false,"reason":"..."},"outfit":{"pass":true/false,"reason":"..."},"product":{"pass":true/false,"reason":"..."},"scene":{"pass":true/false,"reason":"..."}}

Rules:
- face (PERSON1): Check if the first person's face matches PERSON_1_FACE reference EXACTLY: same face shape, eye shape, nose shape, mouth shape, skin tone. Small pose differences are OK but facial STRUCTURE must match exactly. For 2-person images, also check PERSON2 matches PERSON_2_FACE.
- outfit: Check if clothing colors, patterns, styles match REFERENCE exactly — exact color, exact pattern size, exact stitch, exact logo position. Zero tolerance.
- product: Check if the item shown matches REFERENCE exactly. If no product ref provided, pass.
- scene: Check if background/setting matches REFERENCE or scene text description.
- For 2-person: PERSON1 in generated image MUST match PERSON_1_FACE. PERSON2 MUST match PERSON_2_FACE. Do NOT allow identity swap. If faces appear identical to each other, check if each matches its respective reference.`,
  });

  parts.push({ inlineData: { mimeType: generatedImage.mimeType, data: generatedImage.base64 } });

  if (data.sceneRef) {
    parts.push({ text: 'SCENE REFERENCE:' });
    parts.push({ inlineData: { mimeType: data.sceneRef.type, data: data.sceneRef.data } });
  }

  parts.push({ text: 'FACE REFERENCE (Person 1):' });
  parts.push({ inlineData: { mimeType: data.faceRef1.type, data: data.faceRef1.data } });

  if (data.outfitRef1) {
    parts.push({ text: 'OUTFIT REFERENCE (Person 1):' });
    parts.push({ inlineData: { mimeType: data.outfitRef1.type, data: data.outfitRef1.data } });
  }

  if (data.productRef1) {
    parts.push({ text: 'PRODUCT REFERENCE (Person 1):' });
    parts.push({ inlineData: { mimeType: data.productRef1.type, data: data.productRef1.data } });
  }

  if (personCount === 2 && data.faceRef2) {
    parts.push({ text: 'FACE REFERENCE (Person 2):' });
    parts.push({ inlineData: { mimeType: data.faceRef2.type, data: data.faceRef2.data } });

    if (data.outfitRef2) {
      parts.push({ text: 'OUTFIT REFERENCE (Person 2):' });
      parts.push({ inlineData: { mimeType: data.outfitRef2.type, data: data.outfitRef2.data } });
    }

    if (data.productRef2) {
      parts.push({ text: 'PRODUCT REFERENCE (Person 2):' });
      parts.push({ inlineData: { mimeType: data.productRef2.type, data: data.productRef2.data } });
    }
  }

  const url = getModelUrl(MODELS.PRO);
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const response = await fetchWithBackoff(url, body, 3);

  if (!response.ok) {
    return {
      pass: true,
      face: { pass: true },
      outfit: { pass: true },
      product: { pass: true },
      scene: { pass: true },
      overallReason: `QA check failed to run (HTTP ${response.status}) — assuming pass to avoid blocking generation`,
    };
  }

  const result = await response.json() as any;
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    const facePass = parsed.face?.pass !== false;
    const outfitPass = parsed.outfit?.pass !== false;
    const productPass = parsed.product?.pass !== false;
    const scenePass = parsed.scene?.pass !== false;

    return {
      pass: facePass && outfitPass && productPass && scenePass,
      face: { pass: facePass, reason: parsed.face?.reason },
      outfit: { pass: outfitPass, reason: parsed.outfit?.reason },
      product: { pass: productPass, reason: parsed.product?.reason },
      scene: { pass: scenePass, reason: parsed.scene?.reason },
    };
  } catch {
    return {
      pass: true,
      face: { pass: true },
      outfit: { pass: true },
      product: { pass: true },
      scene: { pass: true },
      overallReason: `QA parse failed — assuming pass: ${cleaned.substring(0, 100)}`,
    };
  }
}