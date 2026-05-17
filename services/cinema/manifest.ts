// Cinema Studio — provenance + cost ledger backed by IndexedDB (idb).
//
// Every render is recorded with full provenance: prompt, refs, model used,
// fallbacks tried, cost, latency, output URL. This is the substrate's audit
// trail and the basis for the Render Queue UI.

import { openDB, type IDBPDatabase } from 'idb';
import type { RenderRequest, RenderResult, RoutingDecision } from './types';

const DB_NAME = 'cinema-studio-manifest';
const DB_VERSION = 1;
const STORE = 'renders';

export interface ManifestEntry {
  id: string;                          // uuid
  createdAt: string;
  request: RenderRequest;
  decision: RoutingDecision;
  attempts: AttemptRecord[];
  finalResult?: RenderResult;
  status: 'pending' | 'succeeded' | 'failed' | 'fallback-succeeded';
  totalCostUsd: number;
  totalLatencyMs: number;
  shotName?: string;
  sceneId?: string;
}

export interface AttemptRecord {
  modelId: string;
  startedAt: string;
  endedAt: string;
  outcome: 'success' | 'failure';
  error?: string;
  costUsd?: number;
  latencyMs: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('sceneId', 'sceneId');
          store.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export async function createEntry(
  request: RenderRequest,
  decision: RoutingDecision,
): Promise<ManifestEntry> {
  const entry: ManifestEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    request,
    decision,
    attempts: [],
    status: 'pending',
    totalCostUsd: 0,
    totalLatencyMs: 0,
    shotName: request.shotName,
    sceneId: request.sceneId,
  };
  const db = await getDb();
  await db.put(STORE, entry);
  return entry;
}

export async function recordAttempt(entryId: string, attempt: AttemptRecord): Promise<void> {
  const db = await getDb();
  const entry = (await db.get(STORE, entryId)) as ManifestEntry | undefined;
  if (!entry) return;
  entry.attempts.push(attempt);
  entry.totalCostUsd += attempt.costUsd ?? 0;
  entry.totalLatencyMs += attempt.latencyMs;
  await db.put(STORE, entry);
}

export async function completeEntry(
  entryId: string,
  result: RenderResult,
  status: 'succeeded' | 'fallback-succeeded' = 'succeeded',
): Promise<void> {
  const db = await getDb();
  const entry = (await db.get(STORE, entryId)) as ManifestEntry | undefined;
  if (!entry) return;
  entry.finalResult = result;
  entry.status = status;
  await db.put(STORE, entry);
}

export async function failEntry(entryId: string): Promise<void> {
  const db = await getDb();
  const entry = (await db.get(STORE, entryId)) as ManifestEntry | undefined;
  if (!entry) return;
  entry.status = 'failed';
  await db.put(STORE, entry);
}

export async function listRecent(limit = 50): Promise<ManifestEntry[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex(STORE, 'createdAt')) as ManifestEntry[];
  return all.reverse().slice(0, limit);
}

export async function listByScene(sceneId: string): Promise<ManifestEntry[]> {
  const db = await getDb();
  return (await db.getAllFromIndex(STORE, 'sceneId', sceneId)) as ManifestEntry[];
}

export async function totalSpendUsd(): Promise<number> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as ManifestEntry[];
  return all.reduce((sum, e) => sum + e.totalCostUsd, 0);
}
