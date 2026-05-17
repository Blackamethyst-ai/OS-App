// Cinema Studio — Soul Cast service.
// Persists a Soul Roster in localStorage. Each Soul is a versioned identity
// bundle with auto-curated anchors and a visual profile.

import { openDB, type IDBPDatabase } from 'idb';
import type { SoulCast, SoulRoster, FaceDescriptor, SoulAnchor } from './types';
import {
  computeFaceDescriptor,
  averageDescriptors,
  computeVariance,
  scanLibrary,
} from './faceMatcher';
import { DICO_FACE_ANCHOR, DICO_PRODUCTION_BIBLE } from '../faceAnchor';

const DB_NAME = 'cinema-soul-cast';
const DB_VERSION = 1;
const STORE = 'souls';
const META_STORE = 'meta';

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      },
    });
  }
  return dbPromise;
}

// =============================================================================

export async function listSouls(): Promise<SoulCast[]> {
  const db = await getDb();
  return (await db.getAll(STORE)) as SoulCast[];
}

export async function getSoul(id: string): Promise<SoulCast | undefined> {
  const db = await getDb();
  return (await db.get(STORE, id)) as SoulCast | undefined;
}

export async function getActiveSoulId(): Promise<string | undefined> {
  const db = await getDb();
  return (await db.get(META_STORE, 'activeSoulId')) as string | undefined;
}

export async function setActiveSoulId(id: string | undefined): Promise<void> {
  const db = await getDb();
  if (id) {
    await db.put(META_STORE, id, 'activeSoulId');
  } else {
    await db.delete(META_STORE, 'activeSoulId');
  }
}

export async function getRoster(): Promise<SoulRoster> {
  const souls = await listSouls();
  const activeSoulId = await getActiveSoulId();
  return { souls, activeSoulId };
}

async function saveSoul(soul: SoulCast): Promise<void> {
  const db = await getDb();
  await db.put(STORE, soul);
}

export async function deleteSoul(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
  if ((await getActiveSoulId()) === id) await setActiveSoulId(undefined);
}

// =============================================================================
// Soul Cast lifecycle

export interface CreateSoulInput {
  name: string;                 // 'Dico Sovereign'
  archetype?: string;
  seedPhotoUrls: string[];      // images of the character (real photos)
  faceAnchorPrompt?: string;    // default: DICO_FACE_ANCHOR
  productionBible?: string;     // default: DICO_PRODUCTION_BIBLE
  signatureOutfit?: string;
  defaultStyleSignatureId?: string;
  parentId?: string;
  notes?: string;
}

/**
 * Create a Soul Cast from seed photos. Computes face descriptors for each,
 * averages into a canonical descriptor, persists the Soul. Anchors are not
 * yet curated — call curateFromLibrary() to populate.
 */
export async function createSoul(input: CreateSoulInput): Promise<SoulCast> {
  if (input.seedPhotoUrls.length === 0) {
    throw new Error('Soul Cast requires at least one seed photo');
  }
  // Compute descriptors for each seed (skip ones without detected faces)
  const descriptors: FaceDescriptor[] = [];
  for (const url of input.seedPhotoUrls) {
    const d = await computeFaceDescriptor(url);
    if (d) descriptors.push(d);
  }
  if (descriptors.length === 0) {
    throw new Error('No faces detected in any seed photo');
  }

  const canonical = averageDescriptors(descriptors);
  const variance = computeVariance(descriptors);

  const id = slugify(input.name) + '-v1';
  const now = new Date().toISOString();
  const soul: SoulCast = {
    id,
    name: input.name,
    archetype: input.archetype ?? 'Hero',
    parentId: input.parentId,
    version: 1,
    canonicalDescriptor: canonical,
    seedDescriptors: descriptors,
    variance,
    anchors: descriptors.map(d => ({
      url: d.sourceUrl,
      matchScore: 1,
      detectionScore: d.detectionScore,
      hasFace: true,
      taggedAsHero: true,
      computedAt: d.computedAt,
    })),
    fidelityScore: descriptors.length / 10,  // bootstrap: 10 seeds = 100% bootstrap
    faceAnchorPrompt: input.faceAnchorPrompt ?? DICO_FACE_ANCHOR,
    productionBible: input.productionBible ?? DICO_PRODUCTION_BIBLE,
    signatureOutfit: input.signatureOutfit ?? 'Black leather zip-up jacket over white crew-neck t-shirt with dark fitted pants.',
    defaultStyleSignatureId: input.defaultStyleSignatureId,
    createdAt: now,
    updatedAt: now,
    trainCount: 1,
    renderCount: 0,
    notes: input.notes,
  };
  await saveSoul(soul);
  await setActiveSoulId(id);
  return soul;
}

/**
 * Walk the library, score every image, retain matches. Updates the Soul's
 * anchors set in-place. Higher-scoring matches naturally rise to top of
 * the [Image1..9] auto-fill.
 *
 * Resumable: persists scan state every BATCH_FLUSH_SIZE entries so a tab
 * close, crash, or HMR reload never loses progress. Re-running curate on a
 * partially-scanned soul skips all already-evaluated URLs.
 */
const BATCH_FLUSH_SIZE = 10;

export async function curateFromLibrary(
  soulId: string,
  libraryEntries: Array<{ url: string; category?: string }>,
  opts: {
    onProgress?: (p: { total: number; processed: number; matched: number; currentUrl?: string; resumed?: number }) => void;
    minMatchScore?: number;
    maxAnchors?: number;
    /** If true, ignore prior scan state and rescore every entry. Default: false (resume). */
    forceRescan?: boolean;
  } = {},
): Promise<SoulCast> {
  const soul = await getSoul(soulId);
  if (!soul) throw new Error(`Soul not found: ${soulId}`);

  const max = opts.maxAnchors ?? 100;
  const minScore = opts.minMatchScore ?? 0.6;

  // ----- Resume gate: filter out URLs we already evaluated -----
  const alreadyScanned = new Set<string>(opts.forceRescan ? [] : (soul.scannedUrls ?? []));
  const remaining = libraryEntries.filter(e => !alreadyScanned.has(e.url));
  const total = libraryEntries.length;
  const resumedFrom = total - remaining.length;

  if (resumedFrom > 0) {
    opts.onProgress?.({
      total,
      processed: resumedFrom,
      matched: soul.anchors.length,
      resumed: resumedFrom,
    });
  }

  // ----- Incremental flush state -----
  let pendingScanned: string[] = [];
  let pendingMatches: SoulAnchor[] = [];

  const flush = async () => {
    if (pendingScanned.length === 0 && pendingMatches.length === 0) return;
    const fresh = await getSoul(soulId);
    if (!fresh) return;
    const seen = new Set(fresh.scannedUrls ?? []);
    for (const u of pendingScanned) seen.add(u);
    fresh.scannedUrls = [...seen];
    const merged = new Map<string, SoulAnchor>();
    for (const a of [...fresh.anchors, ...pendingMatches]) {
      const prev = merged.get(a.url);
      if (!prev || a.matchScore > prev.matchScore) merged.set(a.url, a);
    }
    fresh.anchors = [...merged.values()].sort((a, b) => b.matchScore - a.matchScore).slice(0, max);
    fresh.fidelityScore = fresh.anchors.filter(a => a.matchScore >= 0.65).length / 20;
    fresh.lastScanAt = new Date().toISOString();
    fresh.updatedAt = fresh.lastScanAt;
    await saveSoul(fresh);
    pendingScanned = [];
    pendingMatches = [];
  };

  await scanLibrary(remaining, soul.canonicalDescriptor, {
    minMatchScore: minScore,
    concurrency: 6,
    onMatch: (anchor) => { pendingMatches.push(anchor); },
    onScanned: (url) => { pendingScanned.push(url); },
    onBatch: async () => { await flush(); },
    batchSize: BATCH_FLUSH_SIZE,
    onProgress: (p) => {
      opts.onProgress?.({
        total,
        processed: resumedFrom + p.processed,
        matched: (soul.anchors.length - soul.seedDescriptors.length) + p.matched,
        currentUrl: p.currentUrl,
        resumed: resumedFrom,
      });
    },
  });

  await flush();

  const final = await getSoul(soulId);
  if (!final) return soul;
  final.scanComplete = true;
  final.trainCount += 1;
  final.lastScanAt = new Date().toISOString();
  final.updatedAt = final.lastScanAt;
  await saveSoul(final);
  return final;
}

/**
 * Mark which anchors are "hero" — they get priority placement in [Image1..5].
 */
export async function tagHeroAnchors(soulId: string, urls: string[]): Promise<void> {
  const soul = await getSoul(soulId);
  if (!soul) return;
  const set = new Set(urls);
  soul.anchors = soul.anchors.map(a => ({ ...a, taggedAsHero: set.has(a.url) }));
  soul.updatedAt = new Date().toISOString();
  await saveSoul(soul);
}

/**
 * Increment renderCount when a Soul Cast is used in a Seedance render.
 * Eventually we'll feed render quality back into fidelityScore.
 */
export async function recordRender(soulId: string): Promise<void> {
  const soul = await getSoul(soulId);
  if (!soul) return;
  soul.renderCount += 1;
  soul.updatedAt = new Date().toISOString();
  await saveSoul(soul);
}

/**
 * Pick top-N anchors from a Soul, hero-tagged first.
 */
export function topAnchors(soul: SoulCast, n: number): SoulAnchor[] {
  const heroes = soul.anchors.filter(a => a.taggedAsHero);
  const rest = soul.anchors.filter(a => !a.taggedAsHero);
  return [...heroes, ...rest].slice(0, n);
}

// =============================================================================

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
