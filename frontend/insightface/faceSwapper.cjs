const ort = require('onnxruntime-node');
const sharp = require('sharp');
const { getModels } = require('./modelLoader.cjs');

const DET_INPUT_SIZE = 640;
const REC_INPUT_SIZE = 112;
const SWAP_INPUT_SIZE = 128;

const CANONICAL_LANDMARKS = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

function nms(boxes, scores, threshold) {
  if (boxes.length === 0) return [];
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const keep = [];
  while (order.length > 0) {
    const i = order[0];
    keep.push(i);
    const boxA = boxes[i];
    order.splice(0, 1);
    if (order.length === 0) break;
    const reject = [];
    for (let j = 0; j < order.length; j++) {
      const k = order[j];
      const boxB = boxes[k];
      const x1 = Math.max(boxA[0], boxB[0]);
      const y1 = Math.max(boxA[1], boxB[1]);
      const x2 = Math.min(boxA[2], boxB[2]);
      const y2 = Math.min(boxA[3], boxB[3]);
      const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
      const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
      const iou = inter / (areaA + areaB - inter);
      if (iou > threshold) reject.push(j);
    }
    for (let j = reject.length - 1; j >= 0; j--) order.splice(reject[j], 1);
  }
  return keep;
}

function similarityTransformEstimate(src, dst) {
  const srcMean = [0, 0];
  const dstMean = [0, 0];
  for (let i = 0; i < src.length; i++) {
    srcMean[0] += src[i][0];
    srcMean[1] += src[i][1];
    dstMean[0] += dst[i][0];
    dstMean[1] += dst[i][1];
  }
  srcMean[0] /= src.length;
  srcMean[1] /= src.length;
  dstMean[0] /= src.length;
  dstMean[1] /= dst.length;
  let srcVar = 0, dstVar = 0, cov = 0;
  for (let i = 0; i < src.length; i++) {
    const sx = src[i][0] - srcMean[0];
    const sy = src[i][1] - srcMean[1];
    const dx = dst[i][0] - dstMean[0];
    const dy = dst[i][1] - dstMean[1];
    srcVar += sx * sx + sy * sy;
    dstVar += dx * dx + dy * dy;
    cov += sx * dx + sy * dy;
  }
  const s = Math.sqrt(dstVar / srcVar);
  const a = cov / srcVar;
  const r = Math.sqrt(Math.abs(a * s)) || 1;
  const tx = dstMean[0] - srcMean[0] * r;
  const ty = dstMean[1] - srcMean[1] * r;
  return [r, 0, tx, 0, r, ty];
}

function transformPoint(p, matrix) {
  return [
    matrix[0] * p[0] + matrix[1] * p[1] + matrix[2],
    matrix[3] * p[0] + matrix[4] * p[1] + matrix[5],
  ];
}

function inverseMatrix(m) {
  const det = m[0] * m[4] - m[1] * m[3];
  if (Math.abs(det) < 1e-10) return [1, 0, 0, 0, 1, 0];
  const invDet = 1 / det;
  return [
    m[4] * invDet, -m[1] * invDet,
    (m[1] * m[5] - m[4] * m[2]) * invDet,
    -m[3] * invDet, m[0] * invDet,
    (m[3] * m[2] - m[0] * m[5]) * invDet,
  ];
}

async function decodeBase64(base64) {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(raw, 'base64');
}

async function imageToTensor(buffer, targetSize) {
  const img = sharp(buffer);
  const metadata = await img.metadata();
  const origW = metadata.width || 640;
  const origH = metadata.height || 640;
  const maxDim = Math.max(origW, origH);
  const scale = targetSize / maxDim;
  const newW = Math.round(origW * scale);
  const newH = Math.round(origH * scale);
  const padLeft = Math.floor((targetSize - newW) / 2);
  const padTop = Math.floor((targetSize - newH) / 2);
  const resized = await sharp(buffer)
    .resize(newW, newH, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const tensor = new Float32Array(targetSize * targetSize * 3);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcIdx = (y * newW + x) * 3;
      const dstIdx = ((y + padTop) * targetSize + x + padLeft) * 3;
      tensor[dstIdx] = resized[srcIdx];
      tensor[dstIdx + 1] = resized[srcIdx + 1];
      tensor[dstIdx + 2] = resized[srcIdx + 2];
    }
  }
  return { tensor, scale, padLeft, padTop, origW, origH };
}

async function detectFace(buffer, session, faceIndex = 0) {
  const { tensor, scale, padLeft, padTop, origW, origH } = await imageToTensor(buffer, DET_INPUT_SIZE);
  const feeds = { 'input.1': new ort.Tensor('float32', tensor, [1, 3, DET_INPUT_SIZE, DET_INPUT_SIZE]) };
  const results = await session.run(feeds);
  const scores = results['scores'].data;
  const bboxes = results['bboxes'].data;
  const landmarks = results['landmarks'].data;
  const totalAnchors = scores.length;
  const validBoxes = [];
  const validScores = [];
  const validLandmarks = [];
  for (let i = 0; i < totalAnchors; i++) {
    const score = scores[i];
    if (score < 0.5) continue;
    const b = i * 4;
    const l = i * 10;
    const x1 = (bboxes[b] - padLeft) / scale;
    const y1 = (bboxes[b + 1] - padTop) / scale;
    const x2 = (bboxes[b + 2] - padLeft) / scale;
    const y2 = (bboxes[b + 3] - padTop) / scale;
    validBoxes.push([
      Math.max(0, x1), Math.max(0, y1),
      Math.min(origW - 1, x2), Math.min(origH - 1, y2),
    ]);
    validScores.push(score);
    const lm = [];
    for (let j = 0; j < 5; j++) {
      lm.push([
        (landmarks[l + j * 2] - padLeft) / scale,
        (landmarks[l + j * 2 + 1] - padTop) / scale,
      ]);
    }
    validLandmarks.push(lm);
  }
  const keep = nms(validBoxes, validScores, 0.4);
  if (keep.length === 0) return null;
  if (faceIndex >= keep.length) return null;
  return { box: validBoxes[keep[faceIndex]], landmarks: validLandmarks[keep[faceIndex]] };
}

async function extractAlignedFace(buffer, landmarks, targetSize) {
  const canonicalLm = CANONICAL_LANDMARKS.map(([x, y]) => [
    x * targetSize / REC_INPUT_SIZE,
    y * targetSize / REC_INPUT_SIZE,
  ]);
  const mat = similarityTransformEstimate(landmarks, canonicalLm);
  const img = sharp(buffer);
  const metadata = await img.metadata();
  const w = metadata.width || 512;
  const h = metadata.height || 512;
  const inv = inverseMatrix(mat);
  const corners = [
    transformPoint([0, 0], inv),
    transformPoint([targetSize, 0], inv),
    transformPoint([0, targetSize], inv),
    transformPoint([targetSize, targetSize], inv),
  ];
  const minX = Math.max(0, Math.floor(Math.min(...corners.map(c => c[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...corners.map(c => c[1]))));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(...corners.map(c => c[0]))));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(...corners.map(c => c[1]))));
  const cropW = maxX - minX;
  const cropH = maxY - minY;
  if (cropW <= 0 || cropH <= 0) throw new Error('Invalid face alignment crop');
  const cropped = await sharp(buffer)
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize(targetSize, targetSize, { fit: 'fill' })
    .raw()
    .toBuffer();
  return Buffer.from(cropped);
}

async function getFaceEmbedding(alignedFace, session) {
  const pixels = new Float32Array(REC_INPUT_SIZE * REC_INPUT_SIZE * 3);
  for (let i = 0; i < REC_INPUT_SIZE * REC_INPUT_SIZE * 3; i++) {
    pixels[i] = (alignedFace[i] - 127.5) / 128.0;
  }
  const feeds = { 'input.1': new ort.Tensor('float32', pixels, [1, 3, REC_INPUT_SIZE, REC_INPUT_SIZE]) };
  const results = await session.run(feeds);
  const embedding = results['output']?.data || results['683']?.data || results[Object.keys(results)[0]]?.data;
  const embeddingArr = embedding;
  const norm = Math.sqrt(embeddingArr.reduce((sum, v) => sum + v * v, 0));
  const normalized = new Float32Array(embeddingArr.length);
  for (let i = 0; i < embeddingArr.length; i++) {
    normalized[i] = embeddingArr[i] / (norm || 1);
  }
  return normalized;
}

async function swapFaceOnAligned(sourceEmbedding, targetAlignedFace, session) {
  const pixels = new Float32Array(SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3);
  for (let i = 0; i < SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3; i++) {
    pixels[i] = targetAlignedFace[i] / 255.0;
  }
  const embTensor = new Float32Array(SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3 + 512);
  for (let i = 0; i < SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3; i++) {
    embTensor[i] = pixels[i];
  }
  for (let i = 0; i < 512; i++) {
    embTensor[SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3 + i] = sourceEmbedding[i];
  }
  const feeds = { 'input': new ort.Tensor('float32', embTensor, [1, SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3 + 512]) };
  const results = await session.run(feeds);
  const outputData = results[Object.keys(results)[0]]?.data;
  const outBuf = Buffer.alloc(SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3);
  for (let i = 0; i < SWAP_INPUT_SIZE * SWAP_INPUT_SIZE * 3; i++) {
    const v = Math.round((outputData[i] + 1) * 127.5);
    outBuf[i] = Math.max(0, Math.min(255, v));
  }
  return outBuf;
}

async function pasteFace(originalBuffer, swappedFace, landmarks, targetSize) {
  const canonicalLm = CANONICAL_LANDMARKS.map(([x, y]) => [
    x * targetSize / REC_INPUT_SIZE,
    y * targetSize / REC_INPUT_SIZE,
  ]);
  const forwardMat = similarityTransformEstimate(canonicalLm, landmarks);
  const img = sharp(originalBuffer);
  const metadata = await img.metadata();
  const w = metadata.width || 512;
  const h = metadata.height || 512;
  const originalPixels = await img.raw().toBuffer();
  const swappedPixels = new Uint8Array(swappedFace);
  const resultPixels = Buffer.from(originalPixels);
  const cx = landmarks.reduce((s, p) => s + p[0], 0) / 5;
  const cy = landmarks.reduce((s, p) => s + p[1], 0) / 5;
  const faceSize = Math.sqrt(
    (landmarks[0][0] - landmarks[1][0]) ** 2 + (landmarks[0][1] - landmarks[1][1]) ** 2
  ) * 1.5;
  const radius = Math.max(faceSize / 2, 30);
  const x1 = Math.max(0, Math.floor(cx - radius));
  const y1 = Math.max(0, Math.floor(cy - radius));
  const x2 = Math.min(w - 1, Math.ceil(cx + radius));
  const y2 = Math.min(h - 1, Math.ceil(cy + radius));
  const r = 8;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const srcPt = transformPoint([x, y], forwardMat);
      const sx = Math.round(srcPt[0]);
      const sy = Math.round(srcPt[1]);
      if (sx < 0 || sx >= targetSize || sy < 0 || sy >= targetSize) continue;
      const di = (y * w + x) * 3;
      const si = (sy * targetSize + sx) * 3;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      let alpha = 1 - distFromCenter / radius;
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 0.01) continue;
      const blendEdge = Math.min(distFromCenter, radius - distFromCenter) < r;
      if (blendEdge) {
        const edgeAlpha = Math.min(distFromCenter, radius - distFromCenter) / r;
        const useAlpha = alpha * edgeAlpha;
        resultPixels[di] = Math.round(swappedPixels[si] * useAlpha + originalPixels[di] * (1 - useAlpha));
        resultPixels[di + 1] = Math.round(swappedPixels[si + 1] * useAlpha + originalPixels[di + 1] * (1 - useAlpha));
        resultPixels[di + 2] = Math.round(swappedPixels[si + 2] * useAlpha + originalPixels[di + 2] * (1 - useAlpha));
      } else {
        resultPixels[di] = swappedPixels[si];
        resultPixels[di + 1] = swappedPixels[si + 1];
        resultPixels[di + 2] = swappedPixels[si + 2];
      }
    }
  }
  return await sharp(resultPixels, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

async function swapOneFace(sourceBase64, targetBuffer, models, faceIndex = 0) {
  const sourceBuffer = await decodeBase64(sourceBase64);
  const sourceFace = await detectFace(sourceBuffer, models.det);
  if (!sourceFace) return null;
  const sourceAligned = await extractAlignedFace(sourceBuffer, sourceFace.landmarks, REC_INPUT_SIZE);
  const sourceEmbedding = await getFaceEmbedding(sourceAligned, models.rec);
  const targetFace = await detectFace(targetBuffer, models.det, faceIndex);
  if (!targetFace) return null;
  const targetAligned = await extractAlignedFace(targetBuffer, targetFace.landmarks, SWAP_INPUT_SIZE);
  const swappedAligned = await swapFaceOnAligned(sourceEmbedding, targetAligned, models.swap);
  return await pasteFace(targetBuffer, swappedAligned, targetFace.landmarks, SWAP_INPUT_SIZE);
}

async function computeFaceEmbedding(faceImageBase64, mimeType = 'image/jpeg') {
  try {
    const models = await getModels();
    const buffer = await decodeBase64(faceImageBase64);
    const face = await detectFace(buffer, models.det);
    if (!face) return null;
    const aligned = await extractAlignedFace(buffer, face.landmarks, REC_INPUT_SIZE);
    const embedding = await getFaceEmbedding(aligned, models.rec);
    return Array.from(embedding);
  } catch {
    return null;
  }
}

const MIN_SWAP_SIMILARITY = 0.35;

function cosSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

async function applyFaceSwap(sourceFaceBase64, targetImageBase64, sourceMimeType = 'image/jpeg') {
  try {
    const models = await getModels();
    const targetBuffer = await decodeBase64(targetImageBase64);
    const result = await swapOneFace(sourceFaceBase64, targetBuffer, models, 0);
    if (!result) return null;
    const sourceBuffer = await decodeBase64(sourceFaceBase64);
    const sourceFace = await detectFace(sourceBuffer, models.det);
    if (sourceFace) {
      const srcAligned = await extractAlignedFace(sourceBuffer, sourceFace.landmarks, REC_INPUT_SIZE);
      const srcEmb = await getFaceEmbedding(srcAligned, models.rec);
      const swappedFace = await detectFace(result, models.det);
      if (swappedFace) {
        const swAligned = await extractAlignedFace(result, swappedFace.landmarks, REC_INPUT_SIZE);
        const swEmb = await getFaceEmbedding(swAligned, models.rec);
        const sim = cosSim(srcEmb, swEmb);
        if (sim < MIN_SWAP_SIMILARITY) {
          console.warn(`Face swap quality gate: similarity ${sim.toFixed(3)} < ${MIN_SWAP_SIMILARITY}. Rejected.`);
          return null;
        }
      }
    }
    return `data:image/png;base64,${result.toString('base64')}`;
  } catch (err) {
    console.error('Face swap failed:', err);
    return null;
  }
}

async function applyMultiFaceSwap(sourceFaces, targetImageBase64) {
  try {
    const models = await getModels();
    let currentBuffer = await decodeBase64(targetImageBase64);
    const detResult = await detectFace(currentBuffer, models.det);
    if (!detResult) return null;
    const targetFaces = [detResult];
    for (let idx = 1; idx < 5; idx++) {
      const f = await detectFace(currentBuffer, models.det, idx);
      if (f) targetFaces.push(f);
      else break;
    }
    if (targetFaces.length < sourceFaces.length) {
      console.warn(`Expected ${sourceFaces.length} faces but detected ${targetFaces.length}. Using available.`);
    }
    targetFaces.sort((a, b) => {
      const cxA = (a.box[0] + a.box[2]) / 2;
      const cxB = (b.box[0] + b.box[2]) / 2;
      return cxA - cxB;
    });
    const sourceEmbeds = [];
    for (const src of sourceFaces) {
      const srcBuf = await decodeBase64(src.base64);
      const srcFace = await detectFace(srcBuf, models.det);
      if (!srcFace) { sourceEmbeds.push(new Float32Array(512)); continue; }
      const srcAligned = await extractAlignedFace(srcBuf, srcFace.landmarks, REC_INPUT_SIZE);
      sourceEmbeds.push(await getFaceEmbedding(srcAligned, models.rec));
    }
    const targetEmbeds = [];
    for (const tgt of targetFaces) {
      const tgtAligned = await extractAlignedFace(currentBuffer, tgt.landmarks, REC_INPUT_SIZE);
      targetEmbeds.push(await getFaceEmbedding(tgtAligned, models.rec));
    }
    const matches = new Map();
    if (sourceFaces.length === 2 && targetFaces.length >= 2) {
      matches.set(0, 0);
      matches.set(1, 1);
    } else if (sourceFaces.length === 2 && targetFaces.length === 1) {
      matches.set(0, 0);
    } else {
      const simMatrix = [];
      for (let si = 0; si < sourceEmbeds.length; si++) {
        simMatrix[si] = [];
        for (let ti = 0; ti < targetEmbeds.length; ti++) {
          simMatrix[si][ti] = cosSim(sourceEmbeds[si], targetEmbeds[ti]);
        }
      }
      const srcIndices = sourceEmbeds.map((_, i) => i);
      const tgtAvailable = new Set(targetEmbeds.map((_, i) => i));
      while (srcIndices.length > 0 && tgtAvailable.size > 0) {
        let bestSrc = -1, bestTgt = -1, bestSim = -Infinity;
        for (const si of srcIndices) {
          for (const ti of tgtAvailable) {
            if (simMatrix[si][ti] > bestSim) {
              bestSim = simMatrix[si][ti];
              bestSrc = si;
              bestTgt = ti;
            }
          }
        }
        if (bestSrc < 0) break;
        matches.set(bestSrc, bestTgt);
        srcIndices.splice(srcIndices.indexOf(bestSrc), 1);
        tgtAvailable.delete(bestTgt);
      }
    }
    for (const [srcIdx, tgtIdx] of matches.entries()) {
      const sourceBuffer = await decodeBase64(sourceFaces[srcIdx].base64);
      const sourceFace = await detectFace(sourceBuffer, models.det);
      if (!sourceFace) continue;
      const sourceAligned = await extractAlignedFace(sourceBuffer, sourceFace.landmarks, REC_INPUT_SIZE);
      const sourceEmbedding = await getFaceEmbedding(sourceAligned, models.rec);
      const targetAligned = await extractAlignedFace(currentBuffer, targetFaces[tgtIdx].landmarks, SWAP_INPUT_SIZE);
      const swappedAligned = await swapFaceOnAligned(sourceEmbedding, targetAligned, models.swap);
      const swappedBuffer = await pasteFace(currentBuffer, swappedAligned, targetFaces[tgtIdx].landmarks, SWAP_INPUT_SIZE);
      const swappedFace = await detectFace(swappedBuffer, models.det);
      if (swappedFace) {
        const swAligned = await extractAlignedFace(swappedBuffer, swappedFace.landmarks, REC_INPUT_SIZE);
        const swEmb = await getFaceEmbedding(swAligned, models.rec);
        const sim = cosSim(sourceEmbedding, swEmb);
        if (sim < MIN_SWAP_SIMILARITY) {
          console.warn(`Face swap quality gate: similarity ${sim.toFixed(3)} < ${MIN_SWAP_SIMILARITY} for face ${srcIdx}. Keeping original.`);
          continue;
        }
      }
      currentBuffer = swappedBuffer;
    }
    return `data:image/png;base64,${currentBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Multi face swap failed:', err);
    return null;
  }
}

module.exports = { applyFaceSwap, applyMultiFaceSwap, computeFaceEmbedding };
