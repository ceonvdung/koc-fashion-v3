import { type PartItem } from './gemini';

/**
 * Priority Layer for reference images
 * LEVEL 1: FACE (highest priority - identity)
 * LEVEL 2: OUTFIT
 * LEVEL 3: PRODUCT
 * LEVEL 4: SCENE
 * LEVEL 5: CAMERA, ACTION, INTERACTION
 */
export interface ReferenceItem {
  level: number;
  type: 'face' | 'outfit' | 'product' | 'scene' | 'camera' | 'action' | 'interaction';
  owner?: 1 | 2;
  label: string;
  part: PartItem;
}

export interface InstructionContract {
  person1: { face: boolean; outfit: boolean; product: boolean; outfitFromFace?: string };
  person2: { face: boolean; outfit: boolean; product: boolean; outfitFromFace?: string };
  scene: 'image' | 'text' | 'list' | null;
  sceneText: string | null;
  camera: string | null;
  action1: string | null;
  action2: string | null;
  interaction: string | null;
  ratio: string;
  quantity: number;
}

/**
 * Build ordered references array with priority layers
 * LEVEL 1: Face (identity)
 * LEVEL 2: Outfit
 * LEVEL 3: Product
 * LEVEL 4: Scene
 * LEVEL 5: Camera/Action/Interaction (instruction only, no image)
 */
export function buildReferences(data: any, personCount: 1 | 2): ReferenceItem[] {
  const refs: ReferenceItem[] = [];

  if (personCount === 1) {
    // LEVEL 4: Scene (text or image)
    if (data.sceneRef) {
      refs.push({
        level: 4,
        type: 'scene',
        label: 'SCENE REFERENCE',
        part: { type: 'image', base64: data.sceneRef.data, mimeType: data.sceneRef.type },
      });
    } else {
      const sceneText = [data.sceneLevel1, data.sceneLevel2, data.sceneLevel3].filter(Boolean).join(', ');
      if (sceneText) {
        refs.push({
          level: 4,
          type: 'scene',
          label: 'SCENE TEXT',
          part: { type: 'text', text: sceneText },
        });
      }
    }
    // LEVEL 1: Face
    refs.push({
      level: 1, type: 'face', owner: 1, label: 'PERSON_1_FACE',
      part: { type: 'image', base64: data.faceRef1.data, mimeType: data.faceRef1.type },
    });
    // LEVEL 2: Outfit
    if (data.outfitRef1) {
      refs.push({
        level: 2, type: 'outfit', owner: 1, label: 'PERSON_1_OUTFIT',
        part: { type: 'image', base64: data.outfitRef1.data, mimeType: data.outfitRef1.type },
      });
    }
    // LEVEL 3: Product
    if (data.productRef1) {
      refs.push({
        level: 3, type: 'product', owner: 1, label: 'PERSON_1_PRODUCT',
        part: { type: 'image', base64: data.productRef1.data, mimeType: data.productRef1.type },
      });
    }
  } else {
    // === TWO PERSONS: face + outfit + scene images. Product = text in prompt. ===
    refs.push({
      level: 1, type: 'face', owner: 1, label: 'PERSON_1_FACE_LEFT',
      part: { type: 'image', base64: data.faceRef1.data, mimeType: data.faceRef1.type },
    });
    if (data.outfitRef1) {
      refs.push({
        level: 2, type: 'outfit', owner: 1, label: 'PERSON_1_OUTFIT',
        part: { type: 'image', base64: data.outfitRef1.data, mimeType: data.outfitRef1.type },
      });
    }
    refs.push({
      level: 1, type: 'face', owner: 2, label: 'PERSON_2_FACE_RIGHT',
      part: { type: 'image', base64: data.faceRef2!.data, mimeType: data.faceRef2!.type },
    });
    if (data.outfitRef2) {
      refs.push({
        level: 2, type: 'outfit', owner: 2, label: 'PERSON_2_OUTFIT',
        part: { type: 'image', base64: data.outfitRef2.data, mimeType: data.outfitRef2.type },
      });
    }
    // Scene image or text
    if (data.sceneRef) {
      refs.push({
        level: 4, type: 'scene', label: 'SCENE REFERENCE',
        part: { type: 'image', base64: data.sceneRef.data, mimeType: data.sceneRef.type },
      });
    } else {
      const sceneText = [data.sceneLevel1, data.sceneLevel2, data.sceneLevel3].filter(Boolean).join(', ');
      if (sceneText) {
        refs.push({
          level: 4, type: 'scene', label: 'SCENE TEXT',
          part: { type: 'text', text: sceneText },
        });
      }
    }
  }

  return refs;
}

/**
 * Build instruction contract from user data
 * Compact JSON-like structure to minimize token usage
 */
export function buildInstructionContract(data: any, personCount: 1 | 2): InstructionContract {
  const sceneText = [data.sceneLevel1, data.sceneLevel2, data.sceneLevel3].filter(Boolean).join(', ');
  return {
    person1: {
      face: true,
      outfit: !!data.outfitRef1,
      product: !!data.productRef1,
      outfitFromFace: data._outfitFromFace1 || undefined,
    },
    person2: personCount === 2 ? {
      face: true,
      outfit: !!data.outfitRef2,
      product: !!data.productRef2,
      outfitFromFace: data._outfitFromFace2 || undefined,
    } : { face: false, outfit: false, product: false },
    scene: data.sceneRef ? 'image' : (sceneText ? 'text' : null),
    sceneText: sceneText || null,
    camera: data.camera || null,
    action1: data.action1 || null,
    action2: data.action2 || null,
    interaction: data.interaction || null,
    ratio: data.ratio,
    quantity: data.quantity,
  };
}

/**
 * Generate compact instruction prompt from contract
 * Target: <500 tokens
 */
export function buildInstructionPrompt(
  contract: InstructionContract,
  personCount: 1 | 2,
  faceDescriptions?: { person1?: string; person2?: string },
  dna?: { preferred_scenes?: string[]; preferred_camera?: string[]; preferred_styles?: string[]; preferred_lighting?: string[]; preferred_moods?: string[] },
  productDescriptions?: { person1?: string; person2?: string },
  sceneDescription?: string
): string {
  const lines: string[] = [];

  if (personCount === 2) {
    // === TWO PERSON MODE: Each person is a locked table with position ===
    lines.push('GENERATE: Fashion photograph with 2 persons.');
    lines.push('COMPOSITION: PERSON1 on the LEFT side. PERSON2 on the RIGHT side. Do NOT swap positions.');

    // PERSON1 (LEFT)
    const p1Parts: string[] = ['face=PERSON_1_FACE_LEFT'];
    if (contract.person1.outfit || contract.person1.outfitFromFace) p1Parts.push('outfit=PERSON_1_OUTFIT');
    if (productDescriptions?.person1) p1Parts.push(`product=${productDescriptions.person1}`);
    const desc1 = faceDescriptions?.person1 ? ` — ${faceDescriptions.person1}` : '';
    lines.push(`PERSON1 (LEFT): ${p1Parts.join(', ')}.${desc1}`);
    if (!contract.person1.outfit && contract.person1.outfitFromFace) {
      lines.push(`PERSON1 OUTFIT: ${contract.person1.outfitFromFace}.`);
    }
    if (contract.action1) lines.push(`PERSON1 ACTION: ${contract.action1}.`);

    // PERSON2 (RIGHT)
    const p2Parts: string[] = ['face=PERSON_2_FACE_RIGHT'];
    if (contract.person2.outfit || contract.person2.outfitFromFace) p2Parts.push('outfit=PERSON_2_OUTFIT');
    if (productDescriptions?.person2) p2Parts.push(`product=${productDescriptions.person2}`);
    const desc2 = faceDescriptions?.person2 ? ` — ${faceDescriptions.person2}` : '';
    lines.push(`PERSON2 (RIGHT): ${p2Parts.join(', ')}.${desc2}`);
    if (!contract.person2.outfit && contract.person2.outfitFromFace) {
      lines.push(`PERSON2 OUTFIT: ${contract.person2.outfitFromFace}.`);
    }
    if (contract.action2) lines.push(`PERSON2 ACTION: ${contract.action2}.`);

    // Identity
    lines.push('IDENTITY: PERSON1 face must match PERSON_1_FACE_LEFT exactly. PERSON2 face must match PERSON_2_FACE_RIGHT exactly. NO blending, NO swapping, NO third face.');

    // Scene
    if (contract.scene === 'image') {
      let sceneLine = 'SCENE: Use SCENE REFERENCE exactly.';
      if (sceneDescription) sceneLine += ` Also match this description: ${sceneDescription}`;
      lines.push(sceneLine + '.');
    } else if (sceneDescription) {
      lines.push(`SCENE: ${sceneDescription}.`);
    } else if (contract.sceneText) {
      lines.push(`SCENE: ${contract.sceneText}.`);
    } else {
      lines.push('SCENE: Plain neutral background, solid color, clean studio environment.');
    }

    // Camera
    if (contract.camera) lines.push(`CAMERA: ${contract.camera}.`);

    // Interaction
    if (contract.interaction) {
      let text = contract.interaction;
      const hasP1Product = productDescriptions?.person1 || contract.person1.outfitFromFace;
      const hasP2Product = productDescriptions?.person2 || contract.person2.outfitFromFace;
      if (hasP1Product || hasP2Product) {
        text += `. PRODUCT BINDING: ${hasP1Product ? 'PERSON1 holds their product' : ''}${hasP1Product && hasP2Product ? '. ' : ''}${hasP2Product ? 'PERSON2 holds their product' : ''}. Never swap.`;
      }
      lines.push(`INTERACTION: ${text}.`);
    }

    // Style
    lines.push('STYLE: Professional fashion photograph, exact reproduction of references. No artistic embellishment.');

    // DNA
    if (dna) {
      const notes: string[] = [];
      if (dna.preferred_scenes?.length) notes.push(`preferred scenes: ${dna.preferred_scenes.slice(0, 2).join(', ')}`);
      if (dna.preferred_camera?.length) notes.push(`camera angles like ${dna.preferred_camera.slice(0, 2).join(', ')}`);
      if (dna.preferred_styles?.length) notes.push(`style like ${dna.preferred_styles.slice(0, 2).join(', ')}`);
      if (dna.preferred_lighting?.length) notes.push(`lighting like ${dna.preferred_lighting.slice(0, 2).join(', ')}`);
      if (dna.preferred_moods?.length) notes.push(`mood: ${dna.preferred_moods.slice(0, 2).join(', ')}`);
      if (notes.length > 0) lines.push(`USER PREFERENCES: ${notes.join('; ')}.`);
    }

    // PRIORITY
    lines.push('PRIORITY: Face 99% match required — most critical. Outfit+Product 90-95% match. Scene flexible.');

    // CONSTRAINTS
    const c: string[] = [
      'NEVER add extra people.',
      'NEVER change face identity. PERSON1 face = PERSON_1_FACE_LEFT. PERSON2 face = PERSON_2_FACE_RIGHT.',
      'Never change outfit: color, pattern, stitch, logo, button, seam must match exactly.',
      'Never add, remove, or swap products.',
      'NEVER render text, words, labels, captions, or letters.',
    ];
    lines.push(`CONSTRAINTS: ${c.join(' ')}`);
  } else {
    // === SINGLE PERSON (keep original logic) ===
    lines.push('GENERATE: Fashion photograph.');

    const p1Parts: string[] = ['face=REFERENCE'];
    if (contract.person1.outfit || contract.person1.outfitFromFace) p1Parts.push('outfit=REFERENCE');
    if (contract.person1.product) p1Parts.push('product=REFERENCE');
    else p1Parts.push('product=NONE');
    const desc1 = faceDescriptions?.person1 ? ` — ${faceDescriptions.person1}` : '';
    lines.push(`PERSON1: ${p1Parts.join(' ')}.${desc1}`);
    if (!contract.person1.outfit && contract.person1.outfitFromFace) {
      lines.push(`PERSON1 OUTFIT: ${contract.person1.outfitFromFace}.`);
    }

    // Ownership
    lines.push('OWNERSHIP: Person1 uses PERSON_1_* refs only.');

    // Identity
    lines.push('IDENTITY: PERSON1 face MUST BE the EXACT SAME PERSON as PERSON_1_FACE. Do NOT generate a different face.');

    // Scene
    if (contract.scene === 'image') {
      lines.push('SCENE: Use SCENE REFERENCE exactly.');
    } else if (contract.scene === 'text' && contract.sceneText) {
      lines.push(`SCENE: ${contract.sceneText}.`);
    } else {
      lines.push('SCENE: Plain neutral background, solid color, clean studio environment. Do NOT copy background from face reference image.');
    }

    if (contract.camera) lines.push(`CAMERA: ${contract.camera}.`);
    if (contract.action1) lines.push(`ACTION1: ${contract.action1}.`);

    // Style
    lines.push('STYLE: Professional fashion photograph, exact reproduction of references. No artistic embellishment.');

    // DNA
    if (dna) {
      const notes: string[] = [];
      if (dna.preferred_scenes?.length) notes.push(`preferred scenes: ${dna.preferred_scenes.slice(0, 2).join(', ')}`);
      if (dna.preferred_camera?.length) notes.push(`camera angles like ${dna.preferred_camera.slice(0, 2).join(', ')}`);
      if (dna.preferred_styles?.length) notes.push(`style like ${dna.preferred_styles.slice(0, 2).join(', ')}`);
      if (dna.preferred_lighting?.length) notes.push(`lighting like ${dna.preferred_lighting.slice(0, 2).join(', ')}`);
      if (dna.preferred_moods?.length) notes.push(`mood: ${dna.preferred_moods.slice(0, 2).join(', ')}`);
      if (notes.length > 0) lines.push(`USER PREFERENCES: ${notes.join('; ')}.`);
    }

    // PRIORITY
    lines.push('PRIORITY: Face 99% match required — most critical, exact facial structure. Outfit+Product 90-95% match. Scene flexible.');

    // CONSTRAINTS
    const c: string[] = [
      'NEVER add extra people beyond those specified.',
      'NEVER change face identity. PERSON1 face must match PERSON_1_FACE.',
      'Never remove or alter outfit — must match EXACTLY: color, pattern size, stitch placement, logo position, button color, seam style. Do not simplify or embellish.',
      'Never add, remove, or swap products.',
      'NEVER change background elements — preserve scene exactly.',
      'NEVER render text, words, labels, captions, or letters on the image.',
    ];
    lines.push(`CONSTRAINTS: ${c.join(' ')}`);
  }

  return lines.join(' ');
}

/**
 * Convert references array to Gemini parts
 * Orders by level and inserts clear labels
 */
export function referencesToParts(refs: ReferenceItem[]): PartItem[] {
  const parts: PartItem[] = [];

  for (const ref of refs) {
    if (ref.part.type === 'text' && ref.part.text) {
      // Text reference (e.g., scene text) — label + content, no duplication
      parts.push({
        type: 'text',
        text: `${ref.label}: ${ref.part.text}`,
      });
    } else {
      // Image reference
      const instruction = ref.type === 'face' && ref.owner === 1
        ? `REFERENCE ${ref.label}: PERSON1 (LEFT side). Use ONLY for the person on the LEFT. Ignore clothing and background.`
        : ref.type === 'face' && ref.owner === 2
        ? `REFERENCE ${ref.label}: PERSON2 (RIGHT side). Use ONLY for the person on the RIGHT. Ignore clothing and background.`
        : ref.type === 'outfit' && ref.owner === 1
        ? `REFERENCE ${ref.label} — Worn by PERSON1 (LEFT side). Match color, pattern, material exactly. Ignore any person or body in this photo.`
        : ref.type === 'outfit' && ref.owner === 2
        ? `REFERENCE ${ref.label} — Worn by PERSON2 (RIGHT side). Match color, pattern, material exactly. Ignore any person or body in this photo.`
        : ref.type === 'outfit'
        ? `REFERENCE ${ref.label} — GARMENT ONLY. Ignore any person or body in this photo.`
        : ref.type === 'scene'
        ? `REFERENCE ${ref.label} — BACKGROUND ONLY. Ignore any people or objects in this photo.`
        : `REFERENCE ${ref.label} — Use EXACTLY.`;
      parts.push({
        type: 'text',
        text: instruction,
      });
      parts.push(ref.part);
    }
  }

  return parts;
}
