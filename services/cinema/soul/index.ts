// Cinema Studio — Soul Cast public API.

export type {
  SoulCast,
  SoulRoster,
  SoulAnchor,
  FaceDescriptor,
} from './types';

export {
  computeFaceDescriptor,
  averageDescriptors,
  descriptorDistance,
  distanceToScore,
  computeVariance,
  scanLibrary,
} from './faceMatcher';
export type { ScanProgress } from './faceMatcher';

export {
  listSouls,
  getSoul,
  getRoster,
  getActiveSoulId,
  setActiveSoulId,
  deleteSoul,
  createSoul,
  curateFromLibrary,
  tagHeroAnchors,
  recordRender,
  topAnchors,
} from './soulCast';
export type { CreateSoulInput } from './soulCast';

export { DICO_WARDROBE, getWardrobeLook } from './wardrobePacks';
export type { WardrobeLook } from './wardrobePacks';

export { HERO_14, getAnglePose } from './anglePacks';
export type { AnglePose } from './anglePacks';

export { generateMaximumCharacterSheet } from './generateCharacterPack';
export type { CharacterPackProgress, GenerateCharacterPackOpts } from './generateCharacterPack';
