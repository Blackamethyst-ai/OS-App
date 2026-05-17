// Cinema Studio — substrate scene presets.
// Quick-fill prompts that demonstrate Seedance 2.0's reference grammar at
// full power. Pulled from the Anomaly Matrix prompt library aesthetic and
// adapted to action / motion / cinematic shot grammar.

import type { RenderRequest, AspectRatio, Resolution } from './types';

export interface ScenePreset {
  id: string;
  label: string;
  category: 'action' | 'hero' | 'dialogue' | 'establishing' | 'reveal';
  description: string;
  prompt: string;                          // Body referencing [Image1..9] etc.
  durationSec: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  generateAudio: boolean;
  suggestedRefs: {
    images?: string[];                     // hint copy: "Character anchor, profile, full body, environment plate, wardrobe"
    videos?: string[];                     // motion-ref hints
    audio?: string[];                      // audio-ref hints
  };
  // Optional default tags steering the router
  tags?: RenderRequest['tags'];
  budgetTier?: RenderRequest['budgetTier'];
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'sovereign-cathedral',
    label: 'Sovereign Cathedral',
    category: 'hero',
    description: 'Cathedral-scale data vortex hero shot. [Image1] commands the chamber; cyan/purple uplight ignites a multi-directional sweep.',
    prompt: [
      '[Image1] standing on a circular command platform inside a cathedral-scale dark citadel.',
      'Massive vortex of cyan (#00E5FF) and purple (#7C3AED) data streams spiral upward around the figure.',
      'Camera: slow orbital dolly from camera-right to camera-left, ending on a low-angle hero shot.',
      'Lighting: cyan/purple uplight from the vortex casts complex multi-directional color on skin and leather; warm amber spotlight from above.',
      'Match identity exactly to [Image1]; reference [Image2] for jaw/profile carry-over and [Image3] for wardrobe.',
      'Native audio: deep cathedral ambient room tone, low rumble of the vortex, no dialogue.',
      'Style: Gregory Crewdson staged photography meets Vanity Fair Hollywood Issue. Phase One medium-format aesthetic at 150 megapixels.',
    ].join(' '),
    durationSec: 8,
    aspectRatio: '16:9',
    resolution: '720p',
    generateAudio: true,
    suggestedRefs: {
      images: [
        'Character anchor — direct forward gaze',
        'Three-quarter profile camera left',
        'Full-body wardrobe shot',
        'Cathedral / vortex environment plate',
      ],
    },
    tags: ['cinematic', 'character-consistent'],
    budgetTier: 'mid',
  },
  {
    id: 'mirror-corridor-reveal',
    label: 'Mirror Corridor Reveal',
    category: 'reveal',
    description: 'Chrome-framed mirror corridor with infinity reflections. Camera whip-pans across reflections of [Image1] before locking on the real subject.',
    prompt: [
      'Chrome-framed mirror corridor with infinity reflections of [Image1] receding into deep space.',
      'Camera: whip-pan left-to-right across three reflections, then crash-zoom to lock on the real [Image1] in centre frame turning slowly toward camera.',
      'Lighting: teal LED edge-lit panels at 9 oclock high-intensity; warm tungsten key from 2 oclock at 1:4 fill ratio.',
      'Match identity exactly to [Image1]; carry wardrobe from [Image3].',
      'Native audio: low electric hum from the panels, soft breath, footstep on polished glass floor.',
      'Style: Peter Lindbergh meets Mark Seliger.',
    ].join(' '),
    durationSec: 6,
    aspectRatio: '16:9',
    resolution: '720p',
    generateAudio: true,
    suggestedRefs: {
      images: [
        'Character anchor — front-facing',
        'Profile turn camera right',
        'Wardrobe study (leather grain)',
      ],
    },
    tags: ['cinematic', 'character-consistent'],
    budgetTier: 'mid',
  },
  {
    id: 'combat-sequence',
    label: 'Action / Combat Sequence',
    category: 'action',
    description: 'High-energy fight choreography. [Image1] hero, [Video1] supplies motion-ref pacing for impact frames.',
    prompt: [
      '[Image1] in a dark alley fight scene, neon-wet pavement, one combatant entering frame from camera-right.',
      'Camera: handheld tracking on the hero, two punches, duck under a swing, dolly-out finish on a hero stance.',
      'Match motion pacing and impact timing to [Video1].',
      'Lighting: cyan/magenta sodium-vapour rim from above, deep shadow fill below.',
      'Match identity exactly to [Image1]; carry jacket and silhouette from [Image2] and [Image3].',
      'Native audio: cloth impacts, breath, distant city ambience, no music.',
      'Style: David Fincher meets John Wick second unit. Hand-held weight, anamorphic feel.',
    ].join(' '),
    durationSec: 8,
    aspectRatio: '21:9',
    resolution: '720p',
    generateAudio: true,
    suggestedRefs: {
      images: [
        'Hero front-facing',
        'Side profile mid-stance',
        'Wardrobe / jacket detail',
      ],
      videos: ['Motion-pacing reference clip — fight choreography or stunt sequence'],
    },
    tags: ['action', 'cinematic', 'character-consistent'],
    budgetTier: 'mid',
  },
  {
    id: 'boardroom-walk-in',
    label: 'Boardroom Walk-In',
    category: 'establishing',
    description: 'Silhouette enters a glass HQ; camera pulls back as identity locks on [Image1].',
    prompt: [
      'A silhouette enters frame from camera-left and walks toward a wall of floor-to-ceiling glass overlooking a city at golden hour.',
      'As the figure crosses the centre line of frame, camera pulls back into a wide and the identity locks onto [Image1].',
      'Lighting: low golden side-light from camera-right, cool blue ambient fill from glass.',
      'Match identity exactly to [Image1]; environment continuity from [Image2] (HQ plate) and wardrobe from [Image3].',
      'Native audio: muted city hum, single footstep cadence on polished concrete, distant elevator chime.',
      'Style: Wired magazine cover meets Esquire editorial. Natural daylight cinematography.',
    ].join(' '),
    durationSec: 6,
    aspectRatio: '16:9',
    resolution: '720p',
    generateAudio: true,
    suggestedRefs: {
      images: [
        'Character anchor — neutral expression',
        'Environment plate — glass HQ at golden hour',
        'Wardrobe detail',
      ],
    },
    tags: ['cinematic', 'character-consistent'],
    budgetTier: 'mid',
  },
  {
    id: 'fractal-emergence',
    label: 'Fractal Emergence',
    category: 'hero',
    description: 'Boundary scene — [Image1] stands between a collapsing wireframe and emerging fractal terrain.',
    prompt: [
      '[Image1] standing at the boundary between two worlds: above, gray wireframe structures fracture and dissolve into void; below, a Mandelbrot fractal terrain in cyan (#00E5FF) and gold (#FFD600) extends to the horizon.',
      'Camera: slow push-in dolly from a wide establishing shot to a medium chest-up.',
      'Lighting: cyan uplight from the fractals carving facial structure from below; gold ember accents floating in foreground; gray ambient fill above.',
      'Match identity exactly to [Image1]; pose continuity from [Image4] (three-quarter standing).',
      'Native audio: faint crystalline shimmer from the fractals, low hum from the collapsing grid, deep breath.',
      'Style: cosmic, defiant — the moment the map flips right-side up. Photorealistic with volumetric lighting.',
    ].join(' '),
    durationSec: 8,
    aspectRatio: '16:9',
    resolution: '720p',
    generateAudio: true,
    suggestedRefs: {
      images: [
        'Character anchor — neutral',
        'Three-quarter body pose',
        'Wardrobe / leather detail',
      ],
    },
    tags: ['cinematic', 'character-consistent', 'max-fidelity'],
    budgetTier: 'high',
  },
];

export function getPreset(id: string): ScenePreset | undefined {
  return SCENE_PRESETS.find(p => p.id === id);
}

// Future hooks (not yet wired):
//   - Suno music-score generation: feed the scene description as a Suno prompt,
//     pull the resulting MP3, and overlay in a post-production step.
//   - ElevenLabs voice clone: TTS the dialogue line in Dico's cloned voice,
//     pass as [Audio1] for native lip-sync via Seedance.
