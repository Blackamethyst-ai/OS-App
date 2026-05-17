// Cinema Studio — style signature preset pack.
// Director / DP / film-stock / color-science fingerprints. Each preset emits
// a multi-line block appended under "Style:" that imprints a recognizable
// cinematic signature on the shot.

export interface StyleSignature {
  id: string;
  label: string;
  era?: string;
  group: 'portrait' | 'action' | 'auteur' | 'genre' | 'modern' | 'classic';
  prompt: string;
  notes?: string;
}

export const STYLE_SIGNATURES: StyleSignature[] = [
  // --- PORTRAIT ---
  {
    id: 'lindbergh-portrait',
    label: 'Peter Lindbergh portrait',
    group: 'portrait',
    era: '1990s-2010s',
    prompt:
      'Style: Peter Lindbergh black-and-white documentary portrait. Natural light, no makeup, raw human texture. Wind, weather, and emotion visible. Tri-X film grain. Composed with intimacy not distance.',
  },
  {
    id: 'seliger-vanity-fair',
    label: 'Mark Seliger / Vanity Fair Hollywood',
    group: 'portrait',
    era: '2000s-2020s',
    prompt:
      'Style: Mark Seliger Vanity Fair Hollywood Issue. Editorial-grade lighting with a single dominant key, deep shadows preserving feature detail. Phase One medium-format aesthetic at 150 megapixels.',
  },
  {
    id: 'crewdson-staged',
    label: 'Gregory Crewdson staged tableau',
    group: 'portrait',
    era: '2000s-present',
    prompt:
      'Style: Gregory Crewdson staged photography. Cinematic-scale lighting setup, painterly composition, subject in a hyper-real but uncanny tableau. Twilight palette, fog, eerie stillness.',
  },

  // --- AUTEUR ---
  {
    id: 'nolan-imax',
    label: 'Christopher Nolan / IMAX',
    group: 'auteur',
    era: '2010s-2020s',
    prompt:
      'Style: Christopher Nolan IMAX 70mm aesthetic. Monumental scale, deep cool blue / orange contrast, anamorphic flares from practicals. Hoyte van Hoytema cinematography. Architectural compositions.',
  },
  {
    id: 'wes-anderson',
    label: 'Wes Anderson symmetry',
    group: 'auteur',
    era: '2000s-present',
    prompt:
      'Style: Wes Anderson symmetrical composition. Subject perfectly centered, geometric framing, pastel palette with saturated accents, flat-lay or planimetric staging, deliberate stillness.',
  },
  {
    id: 'fincher-procedural',
    label: 'David Fincher procedural',
    group: 'auteur',
    era: '1990s-present',
    prompt:
      'Style: David Fincher procedural thriller. Cool desaturated palette, sodium-vapor green-tinged shadows, surgical camera precision, locked compositions, Jeff Cronenweth cinematography.',
  },
  {
    id: 'kubrick-symmetric',
    label: 'Stanley Kubrick one-point',
    group: 'auteur',
    era: '1960s-1990s',
    prompt:
      'Style: Stanley Kubrick one-point perspective. Centered architectural symmetry, hallway recession, hypnotic rectilinear composition, John Alcott natural-light look.',
  },
  {
    id: 'villeneuve-arrival',
    label: 'Denis Villeneuve / Roger Deakins',
    group: 'auteur',
    era: '2010s-present',
    prompt:
      'Style: Denis Villeneuve via Roger Deakins. Vast scale, monolithic silhouettes against atmospheric sky, muted earth-tone palette, painterly depth, slow contemplative pacing.',
  },

  // --- ACTION / GENRE ---
  {
    id: 'john-wick-action',
    label: 'John Wick second-unit',
    group: 'action',
    era: '2010s-2020s',
    prompt:
      'Style: John Wick second-unit aesthetic. Locked-off wide shots showing full choreography, neon-wet pavement, magenta-cyan rim lighting, hand-held weight during impact frames, no shaky-cam during exchanges.',
  },
  {
    id: 'mad-max-fury',
    label: 'Mad Max: Fury Road',
    group: 'action',
    era: '2010s',
    prompt:
      'Style: Mad Max Fury Road. Center-frame subject through all cuts, bleached-orange / teal sky contrast, hyper-saturated, kinetic action with everything readable in motion.',
  },

  // --- GENRE ---
  {
    id: 'neo-noir',
    label: 'Neo-noir',
    group: 'genre',
    era: '1980s-2020s',
    prompt:
      'Style: Neo-noir. Single hard key light, deep shadows swallowing half the face, smoke or steam in foreground, rain-slick streets, magenta and amber neon practical accents.',
  },
  {
    id: 'blade-runner-2049',
    label: 'Blade Runner 2049',
    group: 'genre',
    era: '2010s',
    prompt:
      'Style: Blade Runner 2049 / Roger Deakins. Saturated single-color floods (orange, teal, magenta) filling entire scenes, atmospheric haze, monumental architectural silhouettes against fog, neon practicals.',
  },
  {
    id: 'cyberpunk-glow',
    label: 'Cyberpunk neon',
    group: 'genre',
    era: '1980s-present',
    prompt:
      'Style: Cyberpunk neon. Dense layered neon practicals — magenta, cyan, hot pink — wet reflective surfaces, atmospheric haze, holographic displays in background bokeh.',
  },
  {
    id: 'a24-indie',
    label: 'A24 indie naturalism',
    group: 'genre',
    era: '2010s-present',
    prompt:
      'Style: A24 indie naturalism. Soft natural light, muted earth-tone palette, intimate framing, organic 35mm grain, lived-in environments, contemplative pacing.',
  },
  {
    id: 'kurosawa-classic',
    label: 'Akira Kurosawa epic',
    group: 'classic',
    era: '1950s-1980s',
    prompt:
      'Style: Akira Kurosawa epic black-and-white. Multi-camera coverage of single moment, weather as character (rain, wind, fog), telephoto compression, choreographed crowd movement.',
  },

  // --- MODERN ---
  {
    id: 'commercial-luxury',
    label: 'Luxury commercial',
    group: 'modern',
    era: '2020s',
    prompt:
      'Style: Luxury commercial cinematography. Macro detail on materials (leather grain, glass, metal), shallow shallow shallow depth of field, slow contemplative motion, golden hour ambient.',
  },
  {
    id: 'documentary-hbo',
    label: 'HBO documentary',
    group: 'modern',
    era: '2010s-present',
    prompt:
      'Style: HBO documentary. Available natural light, hand-held organic motion, observational rather than staged, restrained palette, breath-paced.',
  },
  {
    id: 'magazine-editorial',
    label: 'Wired / Esquire editorial',
    group: 'modern',
    era: '2000s-present',
    prompt:
      'Style: Wired magazine cover meets Esquire editorial. Bright clean backdrop, natural daylight key, holographic displays in background bokeh, optimistic future tone.',
  },
];

export function getStyleSignature(id: string): StyleSignature | undefined {
  return STYLE_SIGNATURES.find(s => s.id === id);
}
