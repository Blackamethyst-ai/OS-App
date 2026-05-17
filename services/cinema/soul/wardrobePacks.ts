// Cinema Studio — wardrobe packs.
// Each Soul Cast carries a default wardrobe (e.g. Dico's signature leather
// jacket) and any number of variant looks. The character-pack generator
// rotates through these to produce the 14-frame Maximum Character Sheet.

export interface WardrobeLook {
  id: string;
  label: string;
  prompt: string;
  notes?: string;
}

// Dico's canonical wardrobe library — pulled from
// ~/.claude/memory/visual_character_profile.md and extended.
export const DICO_WARDROBE: WardrobeLook[] = [
  {
    id: 'signature-leather',
    label: 'Signature leather',
    prompt: 'Black leather zip-up jacket with visible grain and natural creases, white crew-neck t-shirt underneath, dark fitted pants. The exact canonical look from the headshot library.',
    notes: 'Default identity outfit. Used in all Anomaly Matrix renders.',
  },
  {
    id: 'sovereign-suit',
    label: 'Sovereign suit',
    prompt: 'Tailored midnight-charcoal three-piece suit with fitted vest, crisp white shirt with a subtle micro-stripe, no tie or thin black satin tie loose at collar. Modern slim cut, premium wool, sharp shoulder line.',
    notes: 'Boardroom / sovereign mode.',
  },
  {
    id: 'all-black-tactical',
    label: 'All-black tactical',
    prompt: 'All-black technical layering — fitted black mock-neck thermal, black tactical jacket with hidden zippers, black tactical pants, no visible logos. Lean athletic silhouette.',
    notes: 'Action / combat scenes.',
  },
  {
    id: 'casual-hoodie',
    label: 'Casual hoodie',
    prompt: 'Premium black hoodie with subtle texture, dark fitted joggers or relaxed-cut pants, clean white sneakers. Athletic, lived-in but considered.',
    notes: 'Documentary / behind-the-scenes mode.',
  },
  {
    id: 'editorial-trench',
    label: 'Editorial trench',
    prompt: 'Long charcoal wool trench coat over a black turtleneck and black trousers, leather chelsea boots. Cinematic silhouette, fashion editorial weight.',
    notes: 'Magazine / editorial cinematography.',
  },
  {
    id: 'cyberpunk-utility',
    label: 'Cyberpunk utility',
    prompt: 'Tech-noir utility — matte black moto jacket with subtle reflective piping, fitted technical layered tee, cargo trousers with utility detailing, combat boots. Optional minimalist black goggles or smart glasses on collar.',
    notes: 'Cyberpunk / Blade Runner mode.',
  },
];

export function getWardrobeLook(id: string): WardrobeLook | undefined {
  return DICO_WARDROBE.find(w => w.id === id);
}
