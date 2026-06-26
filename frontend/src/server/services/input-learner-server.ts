import { learnInput, learnCamera, hasFace, type InputType } from './input-learner';

export { learnInput, learnCamera, hasFace };
export type { InputType };

export async function learnInputWithAnalysis(userId: string, type: InputType, base64: string) {
  const { analyzeImage } = await import('./gemini');
  const analysisType = type.startsWith('face') ? 'face'
    : type.startsWith('outfit') ? 'outfit'
    : type.startsWith('product') ? 'product'
    : type.startsWith('scene') ? 'scene'
    : 'face';

  let analysis = '';
  try {
    const result = await analyzeImage(base64, 'image/jpeg', analysisType);
    analysis = JSON.stringify(result);
  } catch { console.warn('[InputLearner] Analysis failed, learning without analysis'); }
  return learnInput(userId, type, base64, analysis);
}
