import { getUserPreferences, saveUserPreferences } from '../db';

export interface UserStyleDNA {
  preferred_scenes: string[];
  preferred_camera: string[];
  preferred_styles: string[];
  preferred_lighting: string[];
  preferred_moods: string[];
  preferred_poses: string[];
  preferred_ratios: string[];
  face_similarity_weight: number;
  outfit_similarity_weight: number;
  product_similarity_weight: number;
  luxary_score: number;
  fashion_score: number;
  commercial_score: number;
  creative_score: number;
  totalGenerations: number;
  lastUpdated: string;
}

export function getDefaultDNA(): UserStyleDNA {
  return {
    preferred_scenes: [],
    preferred_camera: [],
    preferred_styles: [],
    preferred_lighting: [],
    preferred_moods: [],
    preferred_poses: [],
    preferred_ratios: [],
    face_similarity_weight: 0.9,
    outfit_similarity_weight: 0.7,
    product_similarity_weight: 0.7,
    luxary_score: 50,
    fashion_score: 50,
    commercial_score: 50,
    creative_score: 50,
    totalGenerations: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export async function loadUserDNA(userId: string): Promise<UserStyleDNA> {
  const prefs = await getUserPreferences(userId);
  if (!prefs) return getDefaultDNA();

  return {
    preferred_scenes: prefs.preferred_scenes || [],
    preferred_camera: prefs.preferred_camera || [],
    preferred_styles: prefs.preferred_styles || [],
    preferred_lighting: prefs.preferred_lighting || [],
    preferred_moods: prefs.preferred_moods || [],
    preferred_poses: prefs.preferred_poses || [],
    preferred_ratios: prefs.preferred_ratios || [],
    face_similarity_weight: prefs.face_similarity_weight || 0.9,
    outfit_similarity_weight: prefs.outfit_similarity_weight || 0.7,
    product_similarity_weight: prefs.product_similarity_weight || 0.7,
    luxary_score: prefs.luxary_score || 50,
    fashion_score: prefs.fashion_score || 50,
    commercial_score: prefs.commercial_score || 50,
    creative_score: prefs.creative_score || 50,
    totalGenerations: prefs.totalGenerations || 0,
    lastUpdated: prefs.lastUpdated || new Date().toISOString(),
  };
}

export async function saveUserDNA(userId: string, dna: UserStyleDNA): Promise<void> {
  await saveUserPreferences(userId, {
    preferred_scenes: dna.preferred_scenes,
    preferred_camera: dna.preferred_camera,
    preferred_styles: dna.preferred_styles,
    preferred_lighting: dna.preferred_lighting,
    preferred_moods: dna.preferred_moods,
    preferred_poses: dna.preferred_poses,
    preferred_ratios: dna.preferred_ratios,
    face_similarity_weight: dna.face_similarity_weight,
    outfit_similarity_weight: dna.outfit_similarity_weight,
    product_similarity_weight: dna.product_similarity_weight,
    luxary_score: dna.luxary_score,
    fashion_score: dna.fashion_score,
    commercial_score: dna.commercial_score,
    creative_score: dna.creative_score,
    totalGenerations: dna.totalGenerations,
    lastUpdated: new Date().toISOString(),
  });
}

export function updateDNAFromFeedback(
  dna: UserStyleDNA,
  feedback: {
    action: 'download' | 'delete' | 'favorite' | 'set_default' | 'fullscreen' | 'zoom' | 'regenerate';
    scene?: string;
    camera?: string;
    style?: string;
    lighting?: string;
    mood?: string;
    pose?: string;
    ratio?: string;
    faceSimilarity?: number;
    outfitSimilarity?: number;
    productSimilarity?: number;
  }
): UserStyleDNA {
  const updated = { ...dna };
  updated.totalGenerations++;

  if (feedback.action === 'download' || feedback.action === 'favorite') {
    if (feedback.scene && !updated.preferred_scenes.includes(feedback.scene)) {
      updated.preferred_scenes.push(feedback.scene);
      if (updated.preferred_scenes.length > 10) updated.preferred_scenes.shift();
    }
    if (feedback.camera && !updated.preferred_camera.includes(feedback.camera)) {
      updated.preferred_camera.push(feedback.camera);
      if (updated.preferred_camera.length > 10) updated.preferred_camera.shift();
    }
    if (feedback.pose && !updated.preferred_poses.includes(feedback.pose)) {
      updated.preferred_poses.push(feedback.pose);
      if (updated.preferred_poses.length > 10) updated.preferred_poses.shift();
    }
    if (feedback.mood && !updated.preferred_moods.includes(feedback.mood)) {
      updated.preferred_moods.push(feedback.mood);
      if (updated.preferred_moods.length > 10) updated.preferred_moods.shift();
    }
    if (feedback.ratio && !updated.preferred_ratios.includes(feedback.ratio)) {
      updated.preferred_ratios.push(feedback.ratio);
      if (updated.preferred_ratios.length > 5) updated.preferred_ratios.shift();
    }

    updated.luxary_score = Math.min(100, updated.luxary_score + 2);
    updated.fashion_score = Math.min(100, updated.fashion_score + 2);
    updated.commercial_score = Math.min(100, updated.commercial_score + 2);

    if (feedback.faceSimilarity && feedback.faceSimilarity < updated.face_similarity_weight) {
      updated.face_similarity_weight = Math.max(0.5, feedback.faceSimilarity / 100);
    }
  }

  if (feedback.action === 'delete') {
    updated.luxary_score = Math.max(0, updated.luxary_score - 3);
    updated.fashion_score = Math.max(0, updated.fashion_score - 3);
    updated.commercial_score = Math.max(0, updated.commercial_score - 3);
    updated.creative_score = Math.min(100, updated.creative_score + 1);
  }

  if (feedback.action === 'set_default' && feedback.style) {
    updated.preferred_styles = [feedback.style];
    updated.preferred_lighting = feedback.lighting ? [feedback.lighting] : updated.preferred_lighting;
  }

  updated.lastUpdated = new Date().toISOString();
  return updated;
}
