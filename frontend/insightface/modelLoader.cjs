const ort = require('onnxruntime-node');
const path = require('path');
const fs = require('fs');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const MODEL_URLS = {
  'det_10g.onnx': 'https://github.com/deepinsight/insightface/releases/download/v0.7/det_10g.onnx',
  'w600k_r50.onnx': 'https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx',
  'inswapper_128.onnx': 'https://github.com/deepinsight/insightface/releases/download/v0.7/inswapper_128.onnx',
};

let instances = null;

async function ensureModelsDownloaded() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
  for (const [filename, url] of Object.entries(MODEL_URLS)) {
    const filepath = path.join(MODELS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`Downloading ${filename}...`);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to download ${filename}: ${resp.status}`);
      const buffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      console.log(`Downloaded ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
    }
  }
}

async function getModels() {
  if (instances) return instances;
  await ensureModelsDownloaded();
  const det = await ort.InferenceSession.create(path.join(MODELS_DIR, 'det_10g.onnx'));
  const rec = await ort.InferenceSession.create(path.join(MODELS_DIR, 'w600k_r50.onnx'));
  const swap = await ort.InferenceSession.create(path.join(MODELS_DIR, 'inswapper_128.onnx'));
  instances = { det, rec, swap };
  return instances;
}

module.exports = { getModels, clearModelCache: () => { instances = null; } };
