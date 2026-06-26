// Context Builder — builds concise prompt + labeled image parts
// One function call produces everything needed to send to Gemini.
// No duplication between prompt text and reference labels.

import type { FaceAnalysis } from './faceAnalyzer';
import type { UserStyleDNA } from './preferenceEngine';
import type { PartItem } from './gemini';
import type { ResolvedScene } from './resolver';
import { resolveScene, resolveAction, resolveActionChar2, resolveInteraction } from './resolver';
import { buildFaceDescription } from './faceAnalyzer';

// Prompt injection protection: sanitize user input to prevent prompt manipulation
function sanitizeUserInput(input: string | undefined, maxLength: number = 200): string {
  if (!input) return '';
  // Remove potential injection patterns
  let sanitized = input
    .replace(/ignore\s+(?:previous|above|all)\s+(?:instructions?|prompts?)/gi, '')
    .replace(/system\s*:\s*/gi, '')
    .replace(/user\s*:\s*/gi, '')
    .replace(/assistant\s*:\s*/gi, '')
    .replace(/<|>/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

// ============ INPUT TYPES ============

interface ImageInput {
  data: string;
  type?: string;
}

interface SingleInput {
  learningNotes?: string[];
  faceRef1: ImageInput;
  faceAnalysis1?: FaceAnalysis | null;
  outfitRef1?: ImageInput;
  productRef1?: ImageInput;
  sceneRef?: ImageInput;
  sceneLevel1?: string;
  sceneLevel2?: string;
  sceneLevel3?: string;
  productAction1_1?: string;
  productAction1_2?: string;
  action1?: string;
  camera?: string;
  ratio: string;
  quantity: number;
  dna?: UserStyleDNA;
}

interface TwoInput {
  learningNotes?: string[];
  faceRef1: ImageInput;
  outfitRef1?: ImageInput;
  productRef1?: ImageInput;
  faceRef2: ImageInput;
  outfitRef2?: ImageInput;
  productRef2?: ImageInput;
  sceneRef?: ImageInput;
  sceneLevel1?: string;
  sceneLevel2?: string;
  sceneLevel3?: string;
  productAction1_1?: string;
  productAction1_2?: string;
  productAction2_1?: string;
  productAction2_2?: string;
  action1?: string;
  action2?: string;
  interaction?: string;
  interaction_1?: string;
  interaction_2?: string;
  camera?: string;
  ratio: string;
  quantity: number;
  dna?: UserStyleDNA;
}

export interface BuildResult {
  parts: PartItem[];
  prompt: string;
  resolvedScene: ResolvedScene;
  resolvedAction: string;
  resolvedInteraction?: string;
}

// ============ IMAGE HELPER ============
 
function normalizeMimeType(type?: string): string {
  const supported = ['image/jpeg', 'image/png', 'image/webp'];
  if (type && supported.includes(type)) return type;
  return 'image/jpeg';
}

function img(data: string, type?: string): PartItem {
  return { type: 'image', base64: data, mimeType: normalizeMimeType(type) };
}

function label(text: string): PartItem {
  return { type: 'text', text };
}

// ============ BUILDER FUNCTIONS ============

export function buildSingleContext(input: SingleInput): BuildResult {
  const scene = resolveScene({
    sceneImage: input.sceneRef ? { data: input.sceneRef.data, type: input.sceneRef.type || 'image/jpeg' } : null,
    sceneLevel1: sanitizeUserInput(input.sceneLevel1, 100),
    sceneLevel2: sanitizeUserInput(input.sceneLevel2, 100),
    sceneLevel3: sanitizeUserInput(input.sceneLevel3, 100),
  });

  const action = resolveAction({
    productAction1_1: sanitizeUserInput(input.productAction1_1, 100),
    productAction1_2: sanitizeUserInput(input.productAction1_2, 100),
    action1: sanitizeUserInput(input.action1, 100),
  });

  const faceDesc = input.faceAnalysis1 ? buildFaceDescription(input.faceAnalysis1) : '';
  const mime = (ref: ImageInput) => ref.type || 'image/jpeg';

  const parts: PartItem[] = [];
  const blocks: string[] = [];

  // --- Scene image (if any) ---
  if (scene.image) {
    parts.push(label('[SCENE]'));
    parts.push(img(scene.image.data, scene.image.type));
  }

  // --- Face ---
  parts.push(label('[FACE]'));
  parts.push(img(input.faceRef1.data, mime(input.faceRef1)));

  // --- Outfit ---
  if (input.outfitRef1) {
    parts.push(label('[OUTFIT]'));
    parts.push(img(input.outfitRef1.data, mime(input.outfitRef1)));
  }

  // --- Product ---
  if (input.productRef1) {
    parts.push(label('[PRODUCT]'));
    parts.push(img(input.productRef1.data, mime(input.productRef1)));
  }

  // --- PROMPT TEXT ---
  blocks.push(`BACKGROUND: ${scene.text}`);
  blocks.push('');
  blocks.push('PERSON (exactly 1, no extra people):');
  blocks.push(`- Identity = [FACE] image. Absolute match — same face shape, features, skin tone.${faceDesc ? ` Details: ${faceDesc}` : ''}`);
  if (input.outfitRef1) {
    blocks.push('- Outfit = [OUTFIT] image. Exact design, color, fabric, silhouette.');
  }
  if (input.productRef1) {
    blocks.push(`- Product = [PRODUCT] image. Exact shape, color, logo, packaging.`);
  }
  blocks.push('');
  blocks.push(`ACTION: ${action}`);
  blocks.push('');
  blocks.push(`COMPOSITION: Camera=${sanitizeUserInput(input.camera, 50) || 'medium shot'}. Ratio=${sanitizeUserInput(input.ratio, 20)}. Photorealistic commercial fashion. 8K.`);

  if (input.dna) {
    const notes: string[] = [];
    const cameras = input.dna.preferred_camera.slice(0, 2).join(', ');
    if (cameras) notes.push(`camera angles like ${cameras}`);
    const scenes = input.dna.preferred_scenes.slice(0, 2).join(', ');
    if (scenes) notes.push(`scenes like ${scenes}`);
    const styles = input.dna.preferred_styles.slice(0, 2).join(', ');
    if (styles) notes.push(`style like ${styles}`);
    const lighting = input.dna.preferred_lighting.slice(0, 2).join(', ');
    if (lighting) notes.push(`lighting like ${lighting}`);
    const moods = input.dna.preferred_moods.slice(0, 2).join(', ');
    if (moods) notes.push(`mood like ${moods}`);
    if (notes.length > 0) blocks.push(`Style note: user prefers ${notes.join('; ')}.`);
  }

  if (input.learningNotes && input.learningNotes.length > 0) {
    blocks.push('');
    blocks.push(`FEEDBACK: ${input.learningNotes.join('. ')}`);
  }

  blocks.push('');
  blocks.push('CRITICAL: Face identity is #1 priority. The face MUST be identical to [FACE] — same person, same features, same skin tone, same face shape, same eyes, nose, and mouth. Any face deviation is unacceptable.');
  blocks.push('');
  blocks.push('REQUIREMENT: 1 image. 1 person. Face=100% match to [FACE].');

  const prompt = blocks.join('\n');
  parts.push(label(prompt));

  return { parts, prompt, resolvedScene: scene, resolvedAction: action };
}

export function buildTwoContext(input: TwoInput): BuildResult {
  const scene = resolveScene({
    sceneImage: input.sceneRef ? { data: input.sceneRef.data, type: input.sceneRef.type || 'image/jpeg' } : null,
    sceneLevel1: sanitizeUserInput(input.sceneLevel1, 100),
    sceneLevel2: sanitizeUserInput(input.sceneLevel2, 100),
    sceneLevel3: sanitizeUserInput(input.sceneLevel3, 100),
  });

  const action1 = resolveAction({
    productAction1_1: sanitizeUserInput(input.productAction1_1, 100),
    productAction1_2: sanitizeUserInput(input.productAction1_2, 100),
    action1: sanitizeUserInput(input.action1, 100),
  });

  const action2 = resolveActionChar2({
    productAction2_1: sanitizeUserInput(input.productAction2_1, 100),
    productAction2_2: sanitizeUserInput(input.productAction2_2, 100),
    action2: sanitizeUserInput(input.action2, 100),
  });

  const interaction = resolveInteraction({
    interaction: sanitizeUserInput(input.interaction, 100),
    interaction_1: sanitizeUserInput(input.interaction_1, 100),
    interaction_2: sanitizeUserInput(input.interaction_2, 100),
  });

  const mime = (ref: ImageInput) => ref.type || 'image/jpeg';

  const parts: PartItem[] = [];
  const blocks: string[] = [];

  // --- Scene image (if any) ---
  if (scene.image) {
    parts.push(label('[SCENE]'));
    parts.push(img(scene.image.data, scene.image.type));
  }

  // --- Character LEFT ---
  parts.push(label('[FACE — LEFT]'));
  parts.push(img(input.faceRef1.data, mime(input.faceRef1)));
  if (input.outfitRef1) {
    parts.push(label('[OUTFIT — LEFT]'));
    parts.push(img(input.outfitRef1.data, mime(input.outfitRef1)));
  }
  if (input.productRef1) {
    parts.push(label('[PRODUCT — LEFT]'));
    parts.push(img(input.productRef1.data, mime(input.productRef1)));
  }

  // --- Character RIGHT ---
  parts.push(label('[FACE — RIGHT]'));
  parts.push(img(input.faceRef2.data, mime(input.faceRef2)));
  if (input.outfitRef2) {
    parts.push(label('[OUTFIT — RIGHT]'));
    parts.push(img(input.outfitRef2.data, mime(input.outfitRef2)));
  }
  if (input.productRef2) {
    parts.push(label('[PRODUCT — RIGHT]'));
    parts.push(img(input.productRef2.data, mime(input.productRef2)));
  }

  // --- PROMPT TEXT ---
  blocks.push(`BACKGROUND: ${scene.text}`);
  blocks.push('');
  blocks.push('LEFT PERSON:');
  blocks.push(`- Identity = [FACE — LEFT]. Absolute match.`);
  if (input.outfitRef1) blocks.push('- Outfit = [OUTFIT — LEFT]. Exact match.');
  if (input.productRef1) blocks.push(`- Product = [PRODUCT — LEFT]. Exact match.`);
  blocks.push(`- Action: ${action1}`);
  blocks.push('');
  blocks.push('RIGHT PERSON:');
  blocks.push(`- Identity = [FACE — RIGHT]. Absolute match.`);
  if (input.outfitRef2) blocks.push('- Outfit = [OUTFIT — RIGHT]. Exact match.');
  if (input.productRef2) blocks.push(`- Product = [PRODUCT — RIGHT]. Exact match.`);
  blocks.push(`- Action: ${action2}`);
  blocks.push('');
  blocks.push(`INTERACTION: ${interaction}`);
  blocks.push('');
  blocks.push(`COMPOSITION: Camera=${sanitizeUserInput(input.camera, 50) || 'medium shot'}. Ratio=${sanitizeUserInput(input.ratio, 20)}. Exactly 2 people. Photorealistic commercial fashion. 8K.`);

  if (input.dna) {
    const notes: string[] = [];
    const cameras = input.dna.preferred_camera.slice(0, 2).join(', ');
    if (cameras) notes.push(`camera angles like ${cameras}`);
    const scenes = input.dna.preferred_scenes.slice(0, 2).join(', ');
    if (scenes) notes.push(`scenes like ${scenes}`);
    const styles = input.dna.preferred_styles.slice(0, 2).join(', ');
    if (styles) notes.push(`style like ${styles}`);
    const lighting = input.dna.preferred_lighting.slice(0, 2).join(', ');
    if (lighting) notes.push(`lighting like ${lighting}`);
    const moods = input.dna.preferred_moods.slice(0, 2).join(', ');
    if (moods) notes.push(`mood like ${moods}`);
    if (notes.length > 0) blocks.push(`Style note: user prefers ${notes.join('; ')}.`);
  }

  if (input.learningNotes && input.learningNotes.length > 0) {
    blocks.push(`FEEDBACK: ${input.learningNotes.join('. ')}`);
  }

  blocks.push('');
  blocks.push('CRITICAL: LEFT person face MUST match [FACE — LEFT]. RIGHT person face MUST match [FACE — RIGHT]. Always maintain correct identity — never swap, never blend, never mix features between the two people.');
  blocks.push('');
  blocks.push('REQUIREMENT: 1 image. Exactly 2 people. LEFT=[FACE — LEFT]. RIGHT=[FACE — RIGHT]. Never add a third person. Never show only one person.');

  const prompt = blocks.join('\n');
  parts.push(label(prompt));

  return { parts, prompt, resolvedScene: scene, resolvedAction: action1, resolvedInteraction: interaction };
}


