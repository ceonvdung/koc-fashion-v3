import { addFeedback as addFeedbackToDb, saveUserPreferences } from '../db';
import { loadUserDNA, saveUserDNA, updateDNAFromFeedback, type UserStyleDNA } from './preferenceEngine';

export interface FeedbackSignal {
  userId: string;
  generationId: string;
  imageIndex: number;
  action: 'download' | 'delete' | 'favorite' | 'set_default' | 'fullscreen' | 'zoom' | 'regenerate';
  metadata?: {
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
    qualityScore?: number;
  };
}

export async function processFeedback(
  signal: FeedbackSignal,
  dna?: UserStyleDNA
): Promise<{ dna: UserStyleDNA; score: number }> {
  // 1. Save raw feedback to DB
  await addFeedbackToDb({
    userId: signal.userId,
    generationId: signal.generationId,
    imageIndex: signal.imageIndex,
    action: signal.action,
    metadata: signal.metadata ? JSON.stringify(signal.metadata) : null,
  });

  // 2. Calculate implicit score
  const score = calculateScore(signal);

  // 3. Update user DNA if meaningful action
  if (!dna) {
    dna = await loadUserDNA(signal.userId);
  }

  if (['download', 'delete', 'favorite', 'set_default'].includes(signal.action)) {
    dna = updateDNAFromFeedback(dna, {
      action: signal.action,
      scene: signal.metadata?.scene,
      camera: signal.metadata?.camera,
      style: signal.metadata?.style,
      lighting: signal.metadata?.lighting,
      mood: signal.metadata?.mood,
      pose: signal.metadata?.pose,
      ratio: signal.metadata?.ratio,
      faceSimilarity: signal.metadata?.faceSimilarity,
      outfitSimilarity: signal.metadata?.outfitSimilarity,
      productSimilarity: signal.metadata?.productSimilarity,
    });

    await saveUserDNA(signal.userId, dna);
  }

  return { dna, score };
}

function calculateScore(signal: FeedbackSignal): number {
  switch (signal.action) {
    case 'download': return 10;
    case 'favorite': return 15;
    case 'set_default': return 20;
    case 'fullscreen': return 3;
    case 'zoom': return 2;
    case 'regenerate': return -3;
    case 'delete': return -10;
    default: return 0;
  }
}

export async function getAggregatedFeedback(userId: string, totalFeedbackCount: number): Promise<{
  totalScore: number;
  downloadRate: number;
  deleteRate: number;
  favoriteRate: number;
  quality: 'high' | 'medium' | 'low';
  needsMoreStrictness: boolean;
}> {
  if (totalFeedbackCount === 0) {
    return { totalScore: 0, downloadRate: 0, deleteRate: 0, favoriteRate: 0, quality: 'medium', needsMoreStrictness: false };
  }

  const dna = await loadUserDNA(userId);
  const quality = dna.luxary_score >= 70 && dna.fashion_score >= 70 ? 'high'
    : dna.luxary_score >= 40 ? 'medium' : 'low';

  return {
    totalScore: dna.luxary_score + dna.fashion_score + dna.commercial_score,
    downloadRate: dna.preferred_poses.length > 0 ? 0.6 : 0.3,
    deleteRate: dna.creative_score > 70 ? 0.4 : 0.15,
    favoriteRate: dna.preferred_scenes.length > 5 ? 0.3 : 0.1,
    quality,
    needsMoreStrictness: dna.face_similarity_weight < 0.7,
  };
}
