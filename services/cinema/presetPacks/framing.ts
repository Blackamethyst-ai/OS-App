// Cinema Studio — framing preset pack.
// Composable prompt fragments for shot framing / lens choice / focus depth.

export interface FramingPreset {
  id: string;
  label: string;
  group: 'close' | 'medium' | 'wide' | 'specialty';
  prompt: string;
  aspectHint?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
}

export const FRAMING_PRESETS: FramingPreset[] = [
  // --- CLOSE ---
  { id: 'extreme-close-up', label: 'Extreme close-up (eye)', group: 'close',
    prompt: 'Framing: extreme close-up on a single eye, only the iris and lashes visible, breath-shallow stillness.',
    aspectHint: '21:9' },
  { id: 'close-up-face', label: 'Close-up (face)', group: 'close',
    prompt: 'Framing: close-up of the face from forehead to chin, full emotional read, shallow depth of field.',
    aspectHint: '3:4' },
  { id: 'choker-shot', label: 'Choker shot', group: 'close',
    prompt: 'Framing: choker shot from collarbone to top of head, intimate without being overly tight.',
    aspectHint: '3:4' },

  // --- MEDIUM ---
  { id: 'medium-chest-up', label: 'Medium (chest up)', group: 'medium',
    prompt: 'Framing: medium chest-up shot, subject framed from sternum up, shoulders fully visible.',
    aspectHint: '16:9' },
  { id: 'cowboy-shot', label: 'Cowboy shot (mid-thigh)', group: 'medium',
    prompt: 'Framing: cowboy shot — subject framed from mid-thigh up, hands visible, classic Western composition.',
    aspectHint: '16:9' },
  { id: 'medium-three-quarter', label: 'Medium three-quarter', group: 'medium',
    prompt: 'Framing: three-quarter body, knees up, full pose visible, environment legible.',
    aspectHint: '16:9' },

  // --- WIDE ---
  { id: 'wide-establishing', label: 'Wide establishing', group: 'wide',
    prompt: 'Framing: wide establishing shot, subject occupies center 1/3 of frame, environment fully visible.',
    aspectHint: '16:9' },
  { id: 'extreme-wide', label: 'Extreme wide (small subject)', group: 'wide',
    prompt: 'Framing: extreme wide shot, subject is small in frame, environment dominates the composition.',
    aspectHint: '21:9' },
  { id: 'full-body', label: 'Full-body', group: 'wide',
    prompt: 'Framing: full-body shot from head to feet, complete silhouette readable.',
    aspectHint: '9:16' },

  // --- SPECIALTY ---
  { id: 'over-shoulder', label: 'Over-the-shoulder (OTS)', group: 'specialty',
    prompt: 'Framing: over-the-shoulder shot, foreground silhouette of one figure, subject in soft focus background.',
    aspectHint: '16:9' },
  { id: 'two-shot', label: 'Two-shot', group: 'specialty',
    prompt: 'Framing: two-shot composition with two subjects sharing frame, balanced thirds.',
    aspectHint: '16:9' },
  { id: 'profile-silhouette', label: 'Profile silhouette', group: 'specialty',
    prompt: 'Framing: pure profile silhouette against bright backlight, identity by edge contour only.',
    aspectHint: '16:9' },
  { id: 'low-angle-hero', label: 'Low-angle hero', group: 'specialty',
    prompt: 'Framing: low angle from below subject\'s waist looking up, hero stance, dominance composition.',
    aspectHint: '9:16' },
  { id: 'top-down', label: 'Top-down (god\'s eye)', group: 'specialty',
    prompt: 'Framing: top-down god\'s-eye composition, subject directly below camera, geometric pattern below.',
    aspectHint: '1:1' },
  { id: 'dutch-angle', label: 'Dutch angle', group: 'specialty',
    prompt: 'Framing: Dutch angle ~25° canted, intentional disorientation, off-axis composition.',
    aspectHint: '16:9' },
];

export function getFraming(id: string): FramingPreset | undefined {
  return FRAMING_PRESETS.find(f => f.id === id);
}
