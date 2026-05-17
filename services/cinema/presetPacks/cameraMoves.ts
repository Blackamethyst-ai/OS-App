// Cinema Studio — camera move preset pack.
// Composable prompt fragments for Seedance 2.0. Each preset emits a single
// sentence appended to the shot prompt under "Camera:" so Seedance has a
// crisp, unambiguous motion directive.
//
// Crafting your own: append to PACK with {id, label, group, prompt}.

export interface CameraMovePreset {
  id: string;
  label: string;
  group: 'push' | 'pull' | 'pan' | 'tilt' | 'dolly' | 'crane' | 'orbital' | 'tracking' | 'aerial' | 'specialty' | 'static';
  prompt: string;
  durationHint?: number;
}

export const CAMERA_MOVES: CameraMovePreset[] = [
  // --- PUSH / PULL ---
  { id: 'push-in-slow', label: 'Slow push-in', group: 'push',
    prompt: 'Camera: slow steady push-in toward the subject, locked perspective, gradual frame tightening over the full duration.' },
  { id: 'push-in-fast', label: 'Fast push-in', group: 'push',
    prompt: 'Camera: aggressive fast push-in, accelerating toward the subject with motion blur on edges.' },
  { id: 'crash-zoom-in', label: 'Crash zoom in', group: 'push',
    prompt: 'Camera: sudden crash zoom into the subject\'s face, hard punctuation on the focal point.' },
  { id: 'pull-out-reveal', label: 'Pull-out reveal', group: 'pull',
    prompt: 'Camera: smooth pull-out from a tight detail to a wide establishing context, revealing the environment.' },
  { id: 'crash-zoom-out', label: 'Crash zoom out', group: 'pull',
    prompt: 'Camera: aggressive crash zoom out, snap to wide shot revealing scale.' },

  // --- PAN ---
  { id: 'whip-pan-lr', label: 'Whip-pan left to right', group: 'pan',
    prompt: 'Camera: hard whip-pan left to right, motion blur during the pan, clean settle on subject.' },
  { id: 'whip-pan-rl', label: 'Whip-pan right to left', group: 'pan',
    prompt: 'Camera: hard whip-pan right to left, motion blur during the pan, clean settle on subject.' },
  { id: 'slow-pan-lr', label: 'Slow pan left to right', group: 'pan',
    prompt: 'Camera: slow lateral pan left to right at a contemplative pace, subject in motion through frame.' },
  { id: 'parallax-pan', label: 'Parallax pan', group: 'pan',
    prompt: 'Camera: lateral pan with strong foreground-to-background parallax, depth emphasized through layered movement.' },

  // --- TILT ---
  { id: 'tilt-up-hero', label: 'Tilt-up hero reveal', group: 'tilt',
    prompt: 'Camera: low angle tilting upward from feet to face, hero reveal as the figure looks down at lens.' },
  { id: 'tilt-down-omni', label: 'Tilt-down omniscient', group: 'tilt',
    prompt: 'Camera: tilt down from sky/ceiling to subject, omniscient framing.' },

  // --- DOLLY ---
  { id: 'dolly-zoom-vertigo', label: 'Dolly zoom (vertigo)', group: 'dolly',
    prompt: 'Camera: dolly-zoom (Vertigo effect) — push in while zooming out, background warps as subject stays locked in frame.' },
  { id: 'side-dolly-tracking', label: 'Side dolly tracking', group: 'dolly',
    prompt: 'Camera: lateral dolly tracking the subject from camera-right side, subject walking in profile, smooth follow.' },
  { id: 'dolly-in-handheld', label: 'Handheld dolly-in', group: 'dolly',
    prompt: 'Camera: handheld dolly-in with natural micro-shake, organic weight, breath-paced.' },

  // --- CRANE ---
  { id: 'crane-up', label: 'Crane up reveal', group: 'crane',
    prompt: 'Camera: crane shot rising vertically from eye-level to high-angle wide, revealing the scope of the environment.' },
  { id: 'crane-down', label: 'Crane down descent', group: 'crane',
    prompt: 'Camera: crane shot descending from high-angle wide to subject\'s eye-level, gradual focus on the figure.' },

  // --- ORBITAL ---
  { id: 'orbital-360', label: '360° orbital', group: 'orbital',
    prompt: 'Camera: full 360° orbital around the subject, locked-on, environment rotating in background.' },
  { id: 'orbital-half', label: '180° half-orbital', group: 'orbital',
    prompt: 'Camera: half-orbital from subject\'s left to right, smooth arc revealing the back-three-quarter.' },
  { id: 'orbital-spiral-up', label: 'Spiral orbital up', group: 'orbital',
    prompt: 'Camera: orbital spiral rising as it circles the subject, gaining altitude through the rotation.' },

  // --- TRACKING ---
  { id: 'tracking-follow', label: 'Tracking follow', group: 'tracking',
    prompt: 'Camera: tracking shot following the subject from behind, maintaining consistent distance.' },
  { id: 'tracking-lead', label: 'Tracking lead (forward)', group: 'tracking',
    prompt: 'Camera: leading tracking shot — camera moves backward as subject walks forward, framed center.' },
  { id: 'tracking-lateral', label: 'Lateral tracking', group: 'tracking',
    prompt: 'Camera: lateral tracking shot, subject walking screen-left to screen-right, camera matching pace in profile.' },

  // --- AERIAL / DRONE ---
  { id: 'fpv-drone-chase', label: 'FPV drone chase', group: 'aerial',
    prompt: 'Camera: FPV drone aggressive chase — diving close to subject, banking hard, organic drone motion.' },
  { id: 'drone-pullback-aerial', label: 'Drone pullback aerial', group: 'aerial',
    prompt: 'Camera: drone aerial pullback, subject becomes smaller as drone gains altitude and reveals scale.' },
  { id: 'top-down-orbital', label: 'Top-down orbital', group: 'aerial',
    prompt: 'Camera: top-down bird\'s-eye orbital around the subject, geometric overhead framing.' },

  // --- SPECIALTY ---
  { id: 'snorricam-rig', label: 'Snorricam (body-mount)', group: 'specialty',
    prompt: 'Camera: Snorricam rig — camera locked to subject\'s torso, subject\'s face stays still while environment moves around them.' },
  { id: 'bullet-time', label: 'Bullet time arc', group: 'specialty',
    prompt: 'Camera: frozen-time arc — camera circles the subject mid-action, subject in slow-mo or stasis, environment slowed.' },
  { id: 'roller-coaster-pov', label: 'Roller-coaster POV', group: 'specialty',
    prompt: 'Camera: first-person POV roller-coaster motion — drops, turns, banking with strong G-force feel.' },
  { id: 'dutch-roll', label: 'Dutch-angle roll', group: 'specialty',
    prompt: 'Camera: Dutch-angle gradual roll — frame tilts from level to ~30° canted, conveying unease.' },

  // --- STATIC ---
  { id: 'static-locked', label: 'Static locked-off', group: 'static',
    prompt: 'Camera: completely static locked-off shot, subject moves through frame, camera does not move at all.' },
  { id: 'static-breathing', label: 'Static with breath', group: 'static',
    prompt: 'Camera: nearly static with imperceptible breath-like micro-movement, organic stillness.' },
];

export function getCameraMove(id: string): CameraMovePreset | undefined {
  return CAMERA_MOVES.find(c => c.id === id);
}
