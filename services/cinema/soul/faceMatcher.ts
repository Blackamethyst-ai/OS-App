// Cinema Studio — face-matching engine.
// Wraps face-api.js to compute 128d face descriptors and rank library
// images by cosine similarity to a canonical Soul descriptor.

import type { FaceDescriptor, SoulAnchor } from './types';

let faceapi: typeof import('face-api.js') | null = null;
let modelsLoaded = false;

const MODEL_PATH = '/models';
const MIN_DETECTION_CONFIDENCE = 0.4;
// Timeout per image — prevents one giant 30MB master_frame from stalling the
// whole scan. 15s gives enough room for 4K decode + WebGL hot path without
// stalling the worker pool on a single bad file.
const PER_IMAGE_TIMEOUT_MS = 15000;
// Max image dimension for face detection — internally we draw to a smaller
// canvas before feeding face-api, which is 5-10× faster on 4K images and
// produces equivalent descriptors at this scale.
const FACE_DETECT_MAX_DIM = 1024;

let warmedUp = false;
async function warmUpWebGL(api: typeof import('face-api.js')): Promise<void> {
  if (warmedUp) return;
  // Tiny 64x64 canvas — runs the full pipeline once so WebGL kernels are
  // compiled before we hit the per-image timeout on the first real image.
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 64, 64);
  try {
    await api
      .detectSingleFace(c, new api.SsdMobilenetv1Options({ minConfidence: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  } catch { /* expected — no face on a gray square */ }
  warmedUp = true;
}

async function ensureFaceApi(): Promise<typeof import('face-api.js')> {
  if (faceapi && modelsLoaded) return faceapi;
  if (!faceapi) {
    faceapi = await import('face-api.js');
  }
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);
    modelsLoaded = true;
  }
  await warmUpWebGL(faceapi);
  return faceapi;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = e => rej(e);
  });
  return img;
}

// Downsample large images into a 1024px-max canvas before feature extraction.
// Face-api models work fine on 1024px and the speedup vs 4K is 5-10×.
function downscaleToCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  if (longSide <= maxDim) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    return c;
  }
  const scale = maxDim / longSide;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return c;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let to: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    to = setTimeout(() => rej(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(to!);
  }
}

export async function computeFaceDescriptor(url: string): Promise<FaceDescriptor | null> {
  const api = await ensureFaceApi();
  return withTimeout((async () => {
    const img = await loadImage(url);
    const canvas = downscaleToCanvas(img, FACE_DETECT_MAX_DIM);
    const result = await api
      .detectSingleFace(canvas, new api.SsdMobilenetv1Options({ minConfidence: MIN_DETECTION_CONFIDENCE }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!result?.descriptor) return null;
    return {
      vector: Array.from(result.descriptor),
      sourceUrl: url,
      detectionScore: result.detection.score,
      computedAt: new Date().toISOString(),
    };
  })(), PER_IMAGE_TIMEOUT_MS, url.slice(0, 60));
}

// Average multiple descriptors into a canonical descriptor.
export function averageDescriptors(descriptors: FaceDescriptor[]): FaceDescriptor {
  if (descriptors.length === 0) {
    throw new Error('Cannot average zero descriptors');
  }
  const dim = descriptors[0].vector.length;
  const avg = new Array(dim).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < dim; i++) avg[i] += d.vector[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= descriptors.length;
  return {
    vector: avg,
    sourceUrl: 'averaged',
    detectionScore: descriptors.reduce((s, d) => s + d.detectionScore, 0) / descriptors.length,
    computedAt: new Date().toISOString(),
  };
}

// L2 distance — face-api.js distances are typically euclidean.
// Lower = closer match. < 0.4 = likely same person, < 0.6 = possibly same.
export function descriptorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Convert L2 distance to a 0-1 match score (1 = perfect match).
// face-api.js threshold is 0.6 for same person; we use a stricter mapping:
//   distance 0.0  → 1.00  (identical descriptor)
//   distance 0.4  → 0.80  (very high confidence same person)
//   distance 0.5  → 0.60  (high confidence same person)
//   distance 0.6  → 0.40  (face-api boundary — uncertain)
//   distance 0.8  → 0.10  (likely different person)
//   distance >1.0 → 0.00
// This is intentionally tighter than the linear mapping — we want only
// high-confidence matches in the auto-curate set.
export function distanceToScore(distance: number): number {
  if (distance >= 1.0) return 0;
  if (distance <= 0.4) return 1 - distance * 0.5;        // 0.0 → 1.0, 0.4 → 0.8
  if (distance <= 0.6) return 0.8 - (distance - 0.4) * 2; // 0.4 → 0.8, 0.6 → 0.4
  return 0.4 - (distance - 0.6) * 1;                      // 0.6 → 0.4, 1.0 → 0
}

// Compute intra-set variance to gauge how tight the seed cluster is.
// Lower variance = more consistent identity signal.
export function computeVariance(descriptors: FaceDescriptor[]): number {
  if (descriptors.length < 2) return 0;
  const avg = averageDescriptors(descriptors);
  const dists = descriptors.map(d => descriptorDistance(d.vector, avg.vector));
  const mean = dists.reduce((s, x) => s + x, 0) / dists.length;
  return mean;
}

export interface ScanProgress {
  total: number;
  processed: number;
  matched: number;
  currentUrl?: string;
}

// Walk the library index and rank each entry by similarity to the canonical
// descriptor. Returns ranked SoulAnchors. Entries without a detected face are
// returned with hasFace: false and matchScore: 0 — useful for diagnostics.
//
// Streaming hooks: onMatch fires for every above-threshold match, onScanned
// for every evaluated URL (matched OR not), and onBatch every `batchSize`
// scanned entries. Callers use these to flush partial state to IDB so a
// crash never loses progress.
export async function scanLibrary(
  libraryEntries: Array<{ url: string; category?: string }>,
  canonical: FaceDescriptor,
  opts: {
    onProgress?: (p: ScanProgress) => void;
    onMatch?: (anchor: SoulAnchor) => void;
    onScanned?: (url: string) => void;
    onBatch?: () => Promise<void> | void;
    batchSize?: number;
    minMatchScore?: number;       // anchors below this are dropped (default: 0.55, tighter than face-api's 0.5 boundary)
    concurrency?: number;          // simultaneous image loads (default: 6)
  } = {},
): Promise<SoulAnchor[]> {
  const minScore = opts.minMatchScore ?? 0.55;
  const concurrency = opts.concurrency ?? 6;
  const batchSize = opts.batchSize ?? 0;
  const matched: SoulAnchor[] = [];
  let processed = 0;
  let sinceFlush = 0;

  // Worker pool with bounded concurrency
  const queue = [...libraryEntries];
  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      if (!entry) break;
      try {
        opts.onProgress?.({
          total: libraryEntries.length,
          processed,
          matched: matched.length,
          currentUrl: entry.url,
        });
        const desc = await computeFaceDescriptor(entry.url);
        if (desc) {
          const dist = descriptorDistance(desc.vector, canonical.vector);
          const score = distanceToScore(dist);
          if (score >= minScore) {
            const cat = (entry.category ?? '').toLowerCase();
            const inferredSource: SoulAnchor['source'] =
              cat.includes('ai') || cat.includes('master_frame') || cat.includes('generated')
                ? 'ai_generated'
                : 'real_photo';
            const anchor: SoulAnchor = {
              url: entry.url,
              category: entry.category,
              source: inferredSource,
              matchScore: score,
              detectionScore: desc.detectionScore,
              hasFace: true,
              computedAt: desc.computedAt,
            };
            matched.push(anchor);
            opts.onMatch?.(anchor);
          }
        }
      } catch {
        // skip broken images silently
      }
      opts.onScanned?.(entry.url);
      processed++;
      sinceFlush++;
      if (batchSize > 0 && sinceFlush >= batchSize) {
        sinceFlush = 0;
        try { await opts.onBatch?.(); } catch { /* swallow flush errors */ }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  matched.sort((a, b) => b.matchScore - a.matchScore);
  opts.onProgress?.({
    total: libraryEntries.length,
    processed,
    matched: matched.length,
  });
  return matched;
}
