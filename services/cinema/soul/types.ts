// Cinema Studio — Soul Cast types.
// A Soul Cast is a versioned, identity-locked character bundle: face
// descriptor + auto-curated anchors + visual profile + style preferences.
// Multiple Soul Casts make up a Roster (e.g., Dico Sovereign, Dico Casual).

export interface FaceDescriptor {
  // 128d float vector from face-api.js faceRecognitionNet
  vector: number[];
  // Source image URL this descriptor was computed from
  sourceUrl: string;
  // Detection confidence 0-1
  detectionScore: number;
  computedAt: string;
}

// Anchor provenance — re-exported from `../types` to keep one source of truth.
// See ImageRef.source for the full classification rules.
export type { AnchorSource } from '../types';
import type { AnchorSource } from '../types';

export interface SoulAnchor {
  url: string;                  // direct URL the substrate can use
  category?: string;            // 'professional' | 'misc' | 'ai-generated' | 'uploaded' | 'picked'
  source?: AnchorSource;        // default inferred from category if omitted
  seedanceEligible?: boolean;   // explicit override — bypasses category inference
  matchScore: number;           // 0-1 cosine similarity to canonical descriptor
  detectionScore: number;       // 0-1 face-api detection confidence
  hasFace: boolean;
  taggedAsHero?: boolean;       // user-flagged best-of
  resolution?: { width: number; height: number };
  computedAt: string;
}

export interface SoulCast {
  id: string;                   // 'dico-sovereign-v1'
  name: string;                 // 'Dico Sovereign'
  archetype: string;            // 'Sovereign Hero'
  parentId?: string;            // for lineage / forks
  version: number;

  // Identity — averaged from seed photos
  canonicalDescriptor: FaceDescriptor;
  seedDescriptors: FaceDescriptor[];  // raw, pre-averaging
  variance: number;             // intra-cluster variance — lower = more consistent

  // Curated anchor set — what feeds [Image1..9] in Seedance
  anchors: SoulAnchor[];        // ranked by matchScore
  fidelityScore: number;        // weighted (#anchors > 0.6 match) / target

  // Visual profile (carried verbatim into prompts)
  faceAnchorPrompt: string;
  productionBible: string;
  signatureOutfit: string;
  skinToneHex?: string;
  defaultStyleSignatureId?: string;

  // Voice (future)
  voiceProfileId?: string;

  // Lineage / commit log
  createdAt: string;
  updatedAt: string;
  trainCount: number;           // increments each time anchors are recomputed
  renderCount: number;          // increments each time a Seedance render uses this Soul

  // Resumable scan state — persisted incrementally so a crash never loses progress.
  // scannedUrls grows on every image we successfully evaluated (matched OR rejected).
  // On resume we filter out anything in this set before walking the library.
  scannedUrls?: string[];
  scanComplete?: boolean;
  lastScanAt?: string;

  // Metadata
  notes?: string;
}

export interface SoulRoster {
  activeSoulId?: string;
  souls: SoulCast[];
}
