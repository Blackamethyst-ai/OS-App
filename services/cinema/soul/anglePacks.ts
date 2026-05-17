// Cinema Studio — angle / pose pack for Maximum Character Sheet.
//
// The "Hero 14" pack saturates NanoBanana Pro's 14-input limit with a
// purposeful spread: 5 portrait angles, 4 body / pose angles, 2 close-ups,
// 2 environmental wides, 1 wardrobe study. Together they give Seedance
// enough identity signal for any motion — close, wide, profile, action.

import type { AspectRatio } from '../types';

export interface AnglePose {
  id: string;
  label: string;
  group: 'portrait' | 'body' | 'closeup' | 'environment' | 'wardrobe';
  prompt: string;
  aspectRatio: AspectRatio;
  /** Default lighting line — pack generator may override per-shot. */
  lighting: string;
}

export const HERO_14: AnglePose[] = [
  // --- 5 portrait angles ---
  {
    id: 'portrait-front-anchor',
    label: 'Front anchor',
    group: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Direct forward gaze, neutral expression, chest-up portrait. This is the face identity anchor — render with absolute photorealistic fidelity.',
    lighting: 'Even key from 11 o\'clock, soft fill from camera-left, neutral gray seamless backdrop.',
  },
  {
    id: 'portrait-three-quarter-left',
    label: 'Three-quarter left',
    group: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Three-quarter profile turn to camera-left, contemplative gaze slightly downward, jaw line visible.',
    lighting: 'Same key as anchor with subtle electric-cyan rim from 4 o\'clock.',
  },
  {
    id: 'portrait-three-quarter-right',
    label: 'Three-quarter right',
    group: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Three-quarter profile turn to camera-right, looking off frame at mid-distance, soft confident expression.',
    lighting: 'Same key from 1 o\'clock now, warm amber rim from 8 o\'clock.',
  },
  {
    id: 'portrait-profile-left',
    label: 'Profile left',
    group: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Pure left profile, jaw set, gaze locked off camera-left, eyebrow architecture readable.',
    lighting: 'Side-lit from camera-left with deep shadow on far side, hard ratio.',
  },
  {
    id: 'portrait-low-angle-hero',
    label: 'Low-angle hero',
    group: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Low-angle from below jaw level looking up, hero stance, subtle knowing half-smile, eyes locked on lens.',
    lighting: 'Warm tungsten key from 2 o\'clock above eye-level, cool teal fill from below.',
  },

  // --- 4 body / pose angles ---
  {
    id: 'body-three-quarter-standing',
    label: 'Three-quarter body standing',
    group: 'body',
    aspectRatio: '16:9',
    prompt: 'Three-quarter body, knees up, standing relaxed, one hand in pocket, slight knowing half-smile.',
    lighting: 'Cinematic key from 2 o\'clock warm tungsten, fill cool 1:4 ratio.',
  },
  {
    id: 'body-full-front',
    label: 'Full body front',
    group: 'body',
    aspectRatio: '9:16',
    prompt: 'Full body, head to feet, neutral standing pose, hands at sides, complete silhouette readable.',
    lighting: 'Even key from above, soft ambient fill, clean studio gradient.',
  },
  {
    id: 'body-walking-toward',
    label: 'Walking toward camera',
    group: 'body',
    aspectRatio: '16:9',
    prompt: 'Walking toward camera at a measured pace, mid-stride, full body in frame, gaze direct.',
    lighting: 'Backlit hero rim from 6 o\'clock high, frontal soft key for face read.',
  },
  {
    id: 'body-seated-contemplative',
    label: 'Seated contemplative',
    group: 'body',
    aspectRatio: '16:9',
    prompt: 'Seated on a minimalist stool, leaning forward elbows on knees, hands clasped, gaze down and to the side in thought.',
    lighting: 'Single hard key from 3 o\'clock with deep shadow on opposite side, no fill.',
  },

  // --- 2 close-ups ---
  {
    id: 'closeup-eye-detail',
    label: 'Eye macro',
    group: 'closeup',
    aspectRatio: '21:9',
    prompt: 'Macro close-up on the right eye and surrounding skin detail. Iris pattern fully readable, individual lash detail, micro-skin texture, mid-blink stillness.',
    lighting: 'Catchlight from 11 o\'clock, soft skin-modeling shadow under brow.',
  },
  {
    id: 'closeup-jawline-grain',
    label: 'Jawline / leather grain',
    group: 'closeup',
    aspectRatio: '3:4',
    prompt: 'Close-up on the jawline-to-collar region — chin, neck, leather lapel, white tee neckline. No face above lips. Material textures hyper-detailed.',
    lighting: 'Hard side-light raking across surfaces, emphasizing leather grain and skin micro-detail.',
  },

  // --- 2 environment wides ---
  {
    id: 'env-cathedral-wide',
    label: 'Cathedral wide',
    group: 'environment',
    aspectRatio: '21:9',
    prompt: 'Subject standing center-frame in a cathedral-scale dark citadel, low-angle wide reveal, environment legible — towering pillars, polished black glass floor, soft cyan edge-lit panels.',
    lighting: 'Cyan/purple uplight from below, warm amber key from above, complex multi-directional color.',
  },
  {
    id: 'env-glass-hq-golden-hour',
    label: 'Glass HQ golden hour',
    group: 'environment',
    aspectRatio: '16:9',
    prompt: 'Subject in a modern glass-walled HQ at golden hour, full-body environmental wide, city visible behind floor-to-ceiling windows.',
    lighting: 'Low golden side-light from camera-right, cool blue ambient fill from glass.',
  },

  // --- 1 wardrobe study ---
  {
    id: 'wardrobe-detail',
    label: 'Wardrobe detail',
    group: 'wardrobe',
    aspectRatio: '3:4',
    prompt: 'Wardrobe study — focused on garment detail (collar, lapel, fabric grain, zipper hardware, buttons). No face. Composition emphasizes construction and material truth.',
    lighting: 'Hard side-light raking across fabric to maximize texture readout, optionally with subtle backlight for edge separation.',
  },
];

export function getAnglePose(id: string): AnglePose | undefined {
  return HERO_14.find(p => p.id === id);
}
