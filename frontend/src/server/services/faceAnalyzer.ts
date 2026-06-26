export interface FaceAnalysis {
  gender: string;
  ageRange: string;
  faceShape: string;
  faceLengthWidthRatio: string;
  jawWidthRatio: string;
  cheekboneWidthRatio: string;
  skinTone: string;
  eyeShape: string;
  eyeColor: string;
  eyeDistanceRatio: string;
  eyeAngle: string;
  palpebralHeight: string;
  noseShape: string;
  noseLengthRatio: string;
  noseWidthRatio: string;
  nasalBridge: string;
  nasalTip: string;
  mouthShape: string;
  lipThicknessRatio: string;
  mouthWidthRatio: string;
  hairStyle: string;
  hairColor: string;
  distinctiveFeatures: string;
  expression: string;
}

import { fetchWithBackoff } from './gemini';

export async function analyzeFace(
  base64Image: string,
  mimeType: string,
): Promise<FaceAnalysis> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`;

  const prompt = `You are a forensic face analyst. Analyze this person's face for 99% accurate AI image reproduction. Return ONLY valid JSON with these exact fields. Use ratio numbers (e.g. "0.38" means 38%) not vague words:

- gender: "male" or "female"
- ageRange: e.g. "25-35"
- faceShape: e.g. "oval", "round", "square", "heart", "diamond", "long"
- faceLengthWidthRatio: face length divided by face width (e.g. "1.35")
- jawWidthRatio: jaw width divided by face width (e.g. "0.72")
- cheekboneWidthRatio: cheekbone width divided by face width (e.g. "0.88")
- skinTone: e.g. "fair", "light", "medium", "olive", "brown", "dark"
- eyeShape: e.g. "almond", "round", "hooded", "monolid", "downturned"
- eyeColor: e.g. "brown", "black", "blue", "green", "hazel"
- eyeDistanceRatio: distance between eyes divided by face width (e.g. "0.38")
- eyeAngle: angle of outer corner relative to inner corner in degrees (e.g. "3" up, "-2" down, "0" straight)
- palpebralHeight: visible eye opening height in cm (e.g. "0.9")
- noseShape: e.g. "straight", "aquiline", "button", "wide", "narrow", "flat", "pointed"
- noseLengthRatio: nose length divided by face length (e.g. "0.38")
- noseWidthRatio: nose width divided by face width (e.g. "0.22")
- nasalBridge: "high", "medium", "low"
- nasalTip: "rounded", "pointed", "bulbous", "flat"
- mouthShape: e.g. "thin lips", "full lips", "wide mouth", "small mouth", "cupid bow"
- lipThicknessRatio: upper lip thickness divided by lower lip (e.g. "0.8")
- mouthWidthRatio: mouth width divided by face width (e.g. "0.45")
- hairStyle: e.g. "short", "medium", "long", "curly", "straight", "wavy", "buzz cut", "ponytail", "bald"
- hairColor: e.g. "black", "brown", "blonde", "red", "grey", "white"
- distinctiveFeatures: precise location of unique traits — e.g. "mole_5mm_left_of_nose_2cm_below_eye", "beard_dense_3mm", "scar_1cm_on_right_cheek"
- expression: e.g. "neutral", "smiling", "serious", "relaxed"

Be extremely specific with ratio numbers. This data must enable 99% accurate face reconstruction.`;

  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const response = await fetchWithBackoff(url, body);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Face analysis failed: ${response.status} ${err}`);
  }

  const result = await response.json() as any;
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      gender: parsed.gender || '',
      ageRange: parsed.ageRange || '',
      faceShape: parsed.faceShape || '',
      faceLengthWidthRatio: parsed.faceLengthWidthRatio || '',
      jawWidthRatio: parsed.jawWidthRatio || '',
      cheekboneWidthRatio: parsed.cheekboneWidthRatio || '',
      skinTone: parsed.skinTone || '',
      eyeShape: parsed.eyeShape || '',
      eyeColor: parsed.eyeColor || '',
      eyeDistanceRatio: parsed.eyeDistanceRatio || '',
      eyeAngle: parsed.eyeAngle || '',
      palpebralHeight: parsed.palpebralHeight || '',
      noseShape: parsed.noseShape || '',
      noseLengthRatio: parsed.noseLengthRatio || '',
      noseWidthRatio: parsed.noseWidthRatio || '',
      nasalBridge: parsed.nasalBridge || '',
      nasalTip: parsed.nasalTip || '',
      mouthShape: parsed.mouthShape || '',
      lipThicknessRatio: parsed.lipThicknessRatio || '',
      mouthWidthRatio: parsed.mouthWidthRatio || '',
      hairStyle: parsed.hairStyle || '',
      hairColor: parsed.hairColor || '',
      distinctiveFeatures: parsed.distinctiveFeatures || '',
      expression: parsed.expression || '',
    };
  } catch {
    return {
      gender: '', ageRange: '', faceShape: '',
      faceLengthWidthRatio: '', jawWidthRatio: '', cheekboneWidthRatio: '',
      skinTone: '', eyeShape: '', eyeColor: '',
      eyeDistanceRatio: '', eyeAngle: '', palpebralHeight: '',
      noseShape: '', noseLengthRatio: '', noseWidthRatio: '', nasalBridge: '', nasalTip: '',
      mouthShape: '', lipThicknessRatio: '', mouthWidthRatio: '',
      hairStyle: '', hairColor: '', distinctiveFeatures: '', expression: '',
    };
  }
}

export function buildFaceDescription(analysis: FaceAnalysis): string {
  const parts: string[] = [];
  if (analysis.gender) parts.push(analysis.gender);
  if (analysis.ageRange) parts.push(`${analysis.ageRange} years old`);
  if (analysis.faceLengthWidthRatio) parts.push(`face_ratio=${analysis.faceLengthWidthRatio}`);
  if (analysis.jawWidthRatio) parts.push(`jaw=${analysis.jawWidthRatio}`);
  if (analysis.cheekboneWidthRatio) parts.push(`cheek=${analysis.cheekboneWidthRatio}`);
  if (analysis.faceShape) parts.push(`${analysis.faceShape} shape`);
  if (analysis.skinTone) parts.push(`${analysis.skinTone} skin`);
  if (analysis.eyeDistanceRatio) parts.push(`eyes_dist=${analysis.eyeDistanceRatio}`);
  if (analysis.eyeAngle) parts.push(`eye_angle=${analysis.eyeAngle}deg`);
  if (analysis.palpebralHeight) parts.push(`palpebral=${analysis.palpebralHeight}cm`);
  if (analysis.eyeShape && analysis.eyeColor) parts.push(`${analysis.eyeShape} ${analysis.eyeColor}`);
  else if (analysis.eyeColor) parts.push(`${analysis.eyeColor} eyes`);
  if (analysis.noseLengthRatio) parts.push(`nose_len=${analysis.noseLengthRatio}`);
  if (analysis.noseWidthRatio) parts.push(`nose_wid=${analysis.noseWidthRatio}`);
  if (analysis.nasalBridge) parts.push(`bridge=${analysis.nasalBridge}`);
  if (analysis.nasalTip) parts.push(`tip=${analysis.nasalTip}`);
  if (analysis.noseShape) parts.push(`${analysis.noseShape} nose`);
  if (analysis.lipThicknessRatio) parts.push(`lips_ratio=${analysis.lipThicknessRatio}`);
  if (analysis.mouthWidthRatio) parts.push(`mouth_wid=${analysis.mouthWidthRatio}`);
  if (analysis.mouthShape) parts.push(`${analysis.mouthShape}`);
  if (analysis.hairStyle && analysis.hairColor) parts.push(`${analysis.hairStyle} ${analysis.hairColor} hair`);
  else if (analysis.hairColor) parts.push(`${analysis.hairColor} hair`);
  else if (analysis.hairStyle) parts.push(`${analysis.hairStyle} hair`);
  if (analysis.expression) parts.push(`${analysis.expression}`);
  if (analysis.distinctiveFeatures) parts.push(`distinct: ${analysis.distinctiveFeatures}`);

  if (parts.length === 0) return '';

  const desc = parts.join(', ');
  return desc.charAt(0).toUpperCase() + desc.slice(1) + '.';
}
