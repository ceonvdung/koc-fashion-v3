// Single Resolution Engine
// Each category returns ONE source only — never mixes multiple sources.
// Priority chain: image > custom text > preset

import { SCENE_DESCRIPTIONS, PRODUCT_ACTION_PRESETS, PRODUCT_ACTION_BY_TYPE } from './scanner';

export interface ResolvedScene {
  source: 'image' | 'text' | 'preset';
  text: string;
  image?: { data: string; type: string };
}

export function resolveScene(input: {
  sceneImage?: { data: string; type: string } | null;
  sceneLevel1?: string;
  sceneLevel2?: string;
  sceneLevel3?: string;
}): ResolvedScene {
  // Priority 1: Ảnh tải lên → bỏ qua text
  if (input.sceneImage?.data) {
    return {
      source: 'image',
      text: 'Scene from SCENE_REF image. Reconstruct this EXACT environment: same lighting, same spatial layout, same mood. Place character(s) inside this space naturally. Do NOT replace with a generic studio background.',
      image: input.sceneImage,
    };
  }

  // Priority 2: Text tự do → bỏ qua preset
  if (input.sceneLevel3?.trim()) {
    return { source: 'text', text: input.sceneLevel3.trim() };
  }

  // Priority 3: Preset từ list
  if (input.sceneLevel2) {
    const desc = SCENE_DESCRIPTIONS[input.sceneLevel2] || input.sceneLevel2;
    return { source: 'preset', text: desc };
  }
  if (input.sceneLevel1) {
    return { source: 'preset', text: `A ${input.sceneLevel1.toLowerCase()} setting.` };
  }

  return { source: 'preset', text: 'Professional photography studio with clean white backdrop and soft studio lighting.' };
}

export function resolveAction(input: {
  productAction1_1?: string;
  productAction1_2?: string;
  productAction2_1?: string;
  productAction2_2?: string;
  action1?: string;
  action2?: string;
  productType?: string;
}): string {
  // Priority 1: Custom text (level 2 > level 1 > action chung)
  if (input.productAction1_2?.trim()) return input.productAction1_2.trim();
  if (input.productAction1_1?.trim()) return input.productAction1_1.trim();
  if (input.action1?.trim()) return input.action1.trim();

  // Priority 2: Product type preset
  if (input.productType && PRODUCT_ACTION_BY_TYPE[input.productType]) {
    const options = PRODUCT_ACTION_BY_TYPE[input.productType];
    return options[0]; // luôn chọn option đầu tiên (ổn định nhất)
  }

  // Fallback: generic preset
  return PRODUCT_ACTION_PRESETS[0];
}

export function resolveActionChar2(input: {
  productAction2_1?: string;
  productAction2_2?: string;
  action2?: string;
  productType?: string;
}): string {
  if (input.productAction2_2?.trim()) return input.productAction2_2.trim();
  if (input.productAction2_1?.trim()) return input.productAction2_1.trim();
  if (input.action2?.trim()) return input.action2.trim();

  if (input.productType && PRODUCT_ACTION_BY_TYPE[input.productType]) {
    return PRODUCT_ACTION_BY_TYPE[input.productType][0];
  }

  return PRODUCT_ACTION_PRESETS[0];
}

export function resolveInteraction(input: {
  interaction?: string;
  interaction_1?: string;
  interaction_2?: string;
}): string {
  // Priority 1: Custom text
  if (input.interaction_2?.trim()) return input.interaction_2.trim();
  if (input.interaction_1?.trim()) return input.interaction_1.trim();
  if (input.interaction?.trim()) return input.interaction.trim();

  return 'Stand side by side, both looking at camera naturally.';
}
