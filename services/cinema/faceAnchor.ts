// Cinema Studio — canonical face anchor block.
// Pulled from ~/.claude/memory/visual_character_profile.md verbatim — this is
// the identity prompt that ships with every NanoBanana keyframe generation
// so Seedance has consistent character signal across shots.

export const DICO_FACE_ANCHOR = `THE PERSON — EXACT IDENTITY (do not deviate):
A young Black man with rich brown skin tone (natural texture, visible pores under
lighting — NO smoothing ever). Short cropped natural black hair with a subtle fade.
A broad smooth forehead with natural proportions. Defined eyebrows with a natural
arch and medium thickness. Deep-set dark brown almond eyes. A medium-bridge nose
with a well-defined tip. Full natural lips with a defined contour. A strong
angular well-defined jawline. A proportional chin with a subtle thin goatee /
facial hair pattern connecting to a thin mustache. Lean athletic fit build — not
bulky. Expression: quiet confidence, subtle warmth, never tense or emotionless.

SIGNATURE OUTFIT (default — deviate only when scene calls for it):
Black leather zip-up jacket (visible leather grain, natural creases, light catching
sheen) over a white crew-neck t-shirt, with dark fitted pants.

DO NOT: smooth the skin, airbrush, plasticize, or stylize toward CGI. Render at
macro skin-detail level. Film grain mandatory.`;

export const DICO_PRODUCTION_BIBLE = `PRODUCTION BIBLE:
Lens: Panavision C-Series anamorphic. Film stock simulation: Kodak Vision3 500T
with heavy organic 35mm grain. Oval anamorphic bokeh in backgrounds. Subtle
horizontal anamorphic flares from light sources.

LIGHTING: Singular dominant key light, high contrast. Teal/cyan rim light from
camera-back at low intensity. Warm amber / gold key on skin. Purple (#7C3AED)
as accent color when scene supports it.

COLOR SCIENCE: Deep cinematic grade — rich blacks, teal (#14B8A6) in shadows
and rim, warm amber on skin highlights. Natural skin tones preserved despite
dramatic colored lighting.

QUALITY: Indistinguishable from a Hollywood film still. Phase One medium-format
photograph at 150 megapixels. Face is always the sharpest element in frame.`;

export const DICO_STYLE_LINE =
  'Peter Lindbergh meets Mark Seliger meets Vanity Fair Hollywood Issue. Gregory Crewdson staged photography. Phase One IQ4 medium-format at 150 megapixels.';
