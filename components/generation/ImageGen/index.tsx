import { apiKeyService } from '../../../services/apiKeyService';
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../../../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY } from '../../../types';
import {
    promptSelectKey, fileToGenerativePart, generateStoryboardPlan,
    constructCinematicPrompt, retryGeminiRequest,
    generateAudioOverview, getAI
} from '../../../services/geminiService';
import { AnimatePresence } from 'motion/react';
import { audio } from '../../../services/audioService';
import { logger } from '../../../services/logger';

// Import types and extracted components
import {
    Frame, ProductionBible, ImageGenProps, ViewLayer, CharacterAnchor
} from './parts/types';
import { VideoMode } from './parts/VideoMode';
import { TeaserMode } from './parts/TeaserMode';
import { CinemaStudio } from '../../CinemaStudio';
import { StudioHeader } from './parts/StudioHeader';
import { StudioFooter } from './parts/StudioFooter';
import { SingleImageMode } from './parts/SingleImageMode';
import { StoryboardMode } from './parts/StoryboardMode';

// ============================================================================
// CONTINUITY ENGINE - Maximum Fidelity Character/Style Preservation
// ============================================================================

/**
 * CONTINUITY_PROTOCOL_V3
 *
 * This system extracts forensic-level detail from reference images and injects
 * them into every generation to maintain identity across frames/videos.
 *
 * Pipeline:
 * 1. Extract biometric anchors (face geometry, textures, distinctive features)
 * 2. Extract world anchors (environment, lighting, color palette)
 * 3. Extract style anchors (composition, film grain, color grading)
 * 4. Build continuity prompt injection for each generation
 */

const FACIAL_ANALYSIS_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
BIOMETRIC_EXTRACTION_PROTOCOL_V4 — FORENSIC IDENTITY RECONSTRUCTION SYSTEM
═══════════════════════════════════════════════════════════════════════════════

You are a forensic facial reconstruction specialist and biometric analyst.
Your task is to extract EVERY measurable facial characteristic with ZERO ambiguity.
This data will be used to reconstruct this EXACT face - any vagueness causes identity drift.

CRITICAL: Be EXTREMELY SPECIFIC. Use precise descriptors, ratios, and measurements.
         "Normal" or "average" are FAILURE conditions - describe what makes THIS face unique.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: CRANIAL STRUCTURE & FACE GEOMETRY
═══════════════════════════════════════════════════════════════════════════════

## 1.1 FACE SHAPE CLASSIFICATION
- Primary shape: (oval/round/square/rectangular/heart/diamond/oblong/triangular/inverted-triangle)
- Face length-to-width ratio: (estimate as ratio, e.g., "1.4:1")
- Facial index classification: (euryprosopic/mesoprosopic/leptoprosopic)
- Vertical thirds balance: (equal/long-forehead/long-midface/long-lower)
- Horizontal fifths balance: describe any deviation from ideal fifths

## 1.2 FOREHEAD ANALYSIS
- Height: (very low <5cm / low / medium / high / very high >7cm appearance)
- Width at temples: (narrow/medium/wide) relative to cheekbones
- Slope angle: (vertical/slightly receding/moderately receding/strongly receding)
- Forehead shape: (flat/slightly convex/rounded/prominent brow ridge)
- Bossing: presence of frontal bossing (none/mild/moderate)
- Temporal hollowing: (none/slight/pronounced)
- Surface texture: (smooth/visible veins/tension lines)

## 1.3 HAIRLINE FORENSICS
- Hairline shape: (straight/M-shaped/widow's peak/rounded/irregular/receding)
- Widow's peak: (absent/subtle/moderate/pronounced) - exact center position
- Temple recession: (none/mild/moderate/significant) - measure depth
- Hairline height: distance from brow to hairline (low/medium/high)
- Baby hairs: (none/sparse/moderate/abundant) - pattern description
- Hairline asymmetry: describe any left-right differences precisely

## 1.4 JAWLINE & CHIN ARCHITECTURE
- Jaw angle: (soft ~140°/moderate ~130°/sharp ~120°/very defined <115°)
- Jaw width: (narrow/medium/wide/very wide) relative to cheekbones
- Mandible shape: (U-shaped/V-shaped/square/rounded)
- Chin shape: (pointed/rounded/square/cleft/receding/protruding)
- Chin projection: (recessed/neutral/projected) - degree
- Chin height: (short/medium/tall)
- Chin cleft/dimple: (absent/subtle indentation/visible cleft/deep cleft)
- Mentolabial fold depth: (shallow/medium/deep)
- Jowl presence: (none/minimal/moderate/significant)

## 1.5 CHEEKBONE STRUCTURE
- Cheekbone prominence: (flat/subtle/moderate/high/very prominent)
- Cheekbone width: widest point location and measurement relative to face
- Cheekbone height: (low near mouth/mid-face/high near eyes)
- Malar projection: (minimal/moderate/strong) - front and lateral
- Infraorbital hollowing: (none/subtle/moderate/pronounced)
- Cheek volume: (hollow/flat/full/very full)
- Buccal fat: (minimal/moderate/full) - position

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: PERIORBITAL REGION (EYES & SURROUNDING)
═══════════════════════════════════════════════════════════════════════════════

## 2.1 EYE SHAPE CLASSIFICATION
- Primary shape: (almond/round/hooded/monolid/downturned/upturned/close-set/wide-set)
- Palpebral fissure: length and height ratio
- Canthal tilt: (positive/neutral/negative) - estimate angle
- Inner canthus shape: (rounded/pointed/covered by epicanthic fold)
- Outer canthus shape: (pointed/rounded/slightly drooping)
- Eye openness: (narrow/medium/wide) - visible iris percentage

## 2.2 EYELID ANATOMY
- Upper lid: (visible crease/hooded/partially hooded/monolid)
- Crease height: (low/medium/high/multiple creases)
- Crease shape: (parallel/tapered/flared)
- Upper lid fullness: (flat/slight/moderate/puffy)
- Lower lid: (tight/slight bag/moderate bag/pronounced)
- Tear trough: (invisible/faint/visible/deep)
- Epicanthic fold: (none/partial/complete) - coverage percentage

## 2.3 IRIS & SCLERA FORENSICS
- Base iris color: (blue/green/hazel/amber/light brown/medium brown/dark brown/black)
- Iris pattern: (solid/two-tone/starburst/ring/crypts visible)
- Limbal ring: (absent/faint/visible/dark/prominent)
- Color variations: describe ANY color variations, flecks, sectors
- Pupil size in image: (constricted/medium/dilated)
- Sclera color: (bright white/slightly yellow/visible vessels)
- Sclera visibility: above iris? below iris? (scleral show)

## 2.4 EYEBROW FORENSICS
- Shape: (straight/soft arch/high arch/S-shaped/rounded)
- Arch position: (inner third/middle/outer third)
- Arch height: (flat/low/medium/high/very arched)
- Thickness: (thin/medium/thick/very thick) - measure at thickest
- Taper: how do they thin toward tail
- Head shape: (square/rounded/pointed/feathered)
- Tail: (short/medium/long/sparse)
- Hair direction: (upward/outward/mixed)
- Color: exact shade, any variation from head hair
- Grooming: (natural/shaped/filled/microbladed appearance)
- Spacing from eye: (close/medium/far)
- Inter-brow distance: (close/average/wide)

## 2.5 PERIORBITAL CHARACTERISTICS
- Brow bone: (flat/subtle ridge/prominent ridge/very prominent)
- Under-eye area: (smooth/fine lines/dark circles/puffiness)
- Crow's feet: (none/faint/moderate/deep)
- Orbital rim visibility: (not visible/slightly visible/prominent)

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: NASAL ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

## 3.1 NOSE SHAPE CLASSIFICATION
- Overall type: (straight/Roman/Greek/aquiline/snub/button/hawk/celestial/nubian/bulbous)
- Nose length: (short/medium/long) relative to face
- Nose width: (narrow/medium/wide) at bridge, middle, and base
- Nose projection: (low/medium/high) from face plane

## 3.2 NASAL BRIDGE
- Bridge height: (low/medium/high/very high)
- Bridge width: (very narrow/narrow/medium/wide)
- Bridge profile: (concave/straight/slightly convex/convex/dorsal hump)
- Hump location: if present, (upper third/middle/lower third)
- Bridge deviation: any asymmetry (left/right lean)
- Nasion depth: (shallow/medium/deep) - where bridge meets brow

## 3.3 NASAL TIP
- Tip shape: (bulbous/boxy/rounded/pointed/pinched/bifid)
- Tip definition: (undefined/soft/defined/very defined)
- Tip projection: (underprojected/normal/overprojected)
- Tip rotation: (drooping/neutral/slightly upturned/upturned)
- Supratip break: (none/subtle/visible/prominent)
- Columellar show: (hidden/2-4mm/excessive)

## 3.4 NOSTRILS & BASE
- Nostril shape: (oval/round/triangular/slit-like)
- Nostril size: (small/medium/large)
- Nostril axis: (horizontal/oblique)
- Alar flare: (minimal/moderate/significant)
- Alar base width: relative to intercanthal distance
- Columella: (straight/curved/hanging/retracted)
- Nasolabial angle: (acute <90°/normal 90-110°/obtuse >110°)

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: ORAL & PERIORAL REGION
═══════════════════════════════════════════════════════════════════════════════

## 4.1 LIP SHAPE & VOLUME
- Overall lip type: (thin/medium/full/very full)
- Upper lip: thickness at center and corners
- Lower lip: thickness at center
- Upper-to-lower ratio: (top heavy/equal/bottom heavy) with ratio
- Lip width: (narrow/medium/wide) relative to nose and face
- Vermilion border: (undefined/soft/defined/very defined/sharp)

## 4.2 UPPER LIP SPECIFICS
- Cupid's bow: (flat/subtle/defined/very pronounced/exaggerated)
- Bow width: (narrow/medium/wide)
- Bow peaks: (rounded/pointed/asymmetric)
- Philtrum columns: (flat/soft/defined/prominent)
- Gull wing shape: describe the M-shape of upper lip

## 4.3 LOWER LIP SPECIFICS
- Shape: (flat/rounded/pouty/hanging)
- Central groove: (none/subtle/visible)
- Lower lip roll: (introverted/neutral/extroverted)

## 4.4 LIP COLOR & TEXTURE
- Natural color: (pale pink/pink/mauve/berry/brown-pink/brown/dark)
- Color gradient: any variation from center to edges
- Texture: (smooth/slightly dry/lined/very textured)
- Lip lines: (none/fine/visible/deep vertical lines)

## 4.5 MOUTH CHARACTERISTICS
- Mouth width: (narrow/medium/wide) - measurement relative to pupils
- Commissures: (upturned/neutral/downturned) - resting position
- Lip asymmetry: describe any left-right differences
- Tooth show at rest: (none/slight/moderate)
- Smile line: if smiling, (low/average/high/gummy)

## 4.6 PHILTRUM
- Length: (short/medium/long)
- Width: (narrow/medium/wide)
- Depth: (flat/shallow/medium/deep)
- Column definition: (absent/soft/visible/prominent)

## 4.7 PERIORAL AREA
- Nasolabial folds: (absent/faint/moderate/deep/very deep)
- Marionette lines: (absent/faint/visible/deep)
- Mentolabial crease: (shallow/medium/deep)
- Oral commissure lines: (none/slight/moderate)
- Perioral rhytids: (none/fine/moderate/deep)

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: SKIN ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

## 5.1 SKIN TONE CLASSIFICATION
- Fitzpatrick type: (I/II/III/IV/V/VI)
- Descriptive tone: (porcelain/fair/light/light-medium/medium/medium-tan/tan/deep tan/brown/deep brown/ebony)
- Undertone: (cool pink/cool blue/neutral/warm yellow/warm peach/warm golden/olive)
- Overtone: any surface color cast

## 5.2 SKIN TEXTURE
- Pore visibility: (invisible/fine/visible/enlarged) - by zone (T-zone, cheeks)
- Surface texture: (glass-smooth/smooth/slightly textured/textured/rough)
- Skin thickness appearance: (thin/delicate/medium/thick)
- Translucency: (opaque/slightly translucent/translucent veins visible)

## 5.3 SKIN CONDITION
- Hydration appearance: (dry/normal/dewy/oily) - by zone
- Redness zones: location and intensity
- Pigmentation evenness: (even/slight variation/moderate variation/significant)
- Under-eye discoloration: (none/slight/moderate/dark) - color (blue/purple/brown)

## 5.4 MARKS, MOLES & SCARS (CRITICAL FOR IDENTITY)
For EACH mark, specify:
- Type: (flat mole/raised mole/freckle/birthmark/scar/acne scar/beauty mark)
- Exact location: use facial landmark grid (e.g., "2cm below left eye outer corner")
- Size: in millimeters or relative to facial features
- Color: relative to surrounding skin
- Shape: (round/oval/irregular)
- Visibility: (faint/moderate/prominent)

## 5.5 FACIAL LINES & WRINKLES
- Forehead lines: (none/1-2 faint/multiple visible/deep horizontal)
- Glabellar lines: (none/faint 11s/visible/deep)
- Crow's feet: (none/fine/moderate/deep)
- Under-eye lines: (none/fine/crepe-y/deep)
- Bunny lines: (none/visible when animated/visible at rest)
- Nasolabial folds: severity 0-4
- Lip lines: (none/fine/smoker's lines/deep vertical)
- Marionette lines: severity 0-4
- Neck lines: (none/1-2/multiple/deep rings)

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: HAIR FORENSICS
═══════════════════════════════════════════════════════════════════════════════

## 6.1 HAIR COLOR ANALYSIS
- Base color: (black/darkest brown/dark brown/medium brown/light brown/dark blonde/medium blonde/light blonde/strawberry/auburn/red/copper/gray/white)
- Dimension: (solid/subtle variation/multi-tonal/highlighted/ombré)
- Highlight colors: if present, exact shades and placement
- Lowlight colors: if present, exact shades
- Root color: if different from lengths
- Gray percentage: (0%/5-10%/25%/50%/75%/100%) and distribution
- Shine level: (matte/satin/shiny/very glossy)

## 6.2 HAIR TEXTURE & TYPE
- Curl pattern: (1-straight/2A-wavy/2B-wavy/2C-wavy/3A-curly/3B-curly/3C-curly/4A-coily/4B-coily/4C-coily)
- Strand thickness: (fine/medium/coarse)
- Density: (thin/medium/thick/very thick)
- Porosity appearance: (low/normal/high)

## 6.3 CURRENT STYLE
- Length: (buzz/short/ear length/chin/shoulder/mid-back/long)
- Cut style: (blunt/layered/textured/shag/pixie/bob/etc.)
- Parting: (none/center/left/right/deep side) - exact position
- Styling: (natural/blown out/curled/straightened/braided/updone)
- Bangs: (none/micro/baby/curtain/side-swept/full/wispy)
- Face framing: describe pieces around face
- Volume: (flat/normal/voluminous/very full)
- Direction: how hair falls, any cowlicks

## 6.4 FACIAL HAIR (if applicable)
- Type: (clean shaven/stubble/short beard/medium beard/long beard/goatee/mustache/sideburns)
- Density: (patchy/medium/full/very dense)
- Color: including any gray
- Shape: (natural/shaped/detailed)
- Mustache style: if present, specific style
- Cheek line: (natural/shaped high/low)
- Neck line: (natural/shaped)
- Growth pattern: any unique patterns or sparse areas

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: FACIAL PROPORTIONS & SYMMETRY
═══════════════════════════════════════════════════════════════════════════════

## 7.1 GOLDEN RATIO ANALYSIS
- Overall facial symmetry score: (highly symmetric/minor asymmetry/moderate asymmetry/notable asymmetry)
- Eye level: are eyes on the same horizontal plane?
- Eyebrow symmetry: differences in shape, height, thickness
- Ear symmetry: if visible, differences in position, size
- Nostril symmetry: differences in size, shape
- Lip symmetry: differences in fullness, commissure height
- Jaw symmetry: any mandibular deviation

## 7.2 SPECIFIC ASYMMETRIES (CRITICAL - these are identity markers)
For each asymmetry found, describe:
- Which feature is asymmetric
- How the left differs from right (be specific)
- Degree: (subtle/noticeable/significant)

## 7.3 PROPORTIONAL RELATIONSHIPS
- Eye width to face width ratio
- Nose width to face width ratio
- Mouth width to nose width ratio
- Interpupillary distance appearance
- Nose length to face length ratio
- Upper lip to lower lip ratio
- Facial thirds balance

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: EXPRESSION & ANIMATION BASELINE
═══════════════════════════════════════════════════════════════════════════════

## 8.1 RESTING EXPRESSION
- Overall impression: (serious/neutral/pleasant/slightly smiling/other)
- Eye expression: (intense/alert/soft/tired/warm/piercing)
- Mouth position: (closed lips/slightly parted/teeth showing)
- Brow position: (furrowed/neutral/raised)
- Muscle tension: visible areas of tension

## 8.2 EXPRESSION MARKERS
- RBF indicators: if any, describe
- Smile lines at rest: visible or not
- Default lip position: any natural pout/purse/smile
- Eye squint tendency: any habitual narrowing

## 8.3 IF EXPRESSION SHOWN
- Expression type: (genuine smile/social smile/smirk/laugh/serious/etc.)
- Duchenne markers: eye crinkle present?
- Teeth visibility: how many, which teeth
- Gum visibility: if smiling
- Expression asymmetry: any one-sided tendencies

═══════════════════════════════════════════════════════════════════════════════
SECTION 9: DISTINGUISHING CHARACTERISTICS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

## 9.1 TOP 5 MOST DISTINCTIVE FEATURES
List the 5 features that are MOST unique to this face and would immediately identify them:
1.
2.
3.
4.
5.

## 9.2 IDENTITY ANCHORS
What makes this face UNMISTAKABLY this person:
- Primary identifier:
- Secondary identifier:
- Tertiary identifier:

## 9.3 POTENTIAL CONFUSION POINTS
Features that might drift if not carefully monitored:
- High-risk drift feature 1:
- High-risk drift feature 2:
- High-risk drift feature 3:

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Output as structured JSON with all sections filled. NO FIELD should be empty or say "normal" without specifics.
For any feature, if truly average, describe WHAT MAKES IT AVERAGE in this specific face.
Every description should be detailed enough that another analyst could verify the same finding.
`;

const WORLD_ANALYSIS_PROMPT = `
ENVIRONMENT_EXTRACTION_PROTOCOL

Extract exact specifications for environment/world continuity across generations.

## SPATIAL COMPOSITION
- Camera position: angle, height, distance
- Depth of field: focal length estimate, bokeh characteristics
- Perspective: (wide/normal/telephoto compression)

## LIGHTING SETUP
- Key light: direction, quality (hard/soft), color temperature
- Fill light: ratio to key, direction
- Rim/back light: presence, intensity, position
- Ambient: level, color cast
- Light sources: (natural/artificial/mixed) with specifics
- Shadow characteristics: density, softness, direction

## COLOR PALETTE
- Dominant colors: list with hex approximations
- Color temperature: (warm/neutral/cool) with Kelvin estimate
- Saturation level: (desaturated/natural/saturated/hyper)
- Color grading style: (teal-orange/monochromatic/complementary/etc)

## ATMOSPHERE
- Air quality: (clear/hazy/dusty/foggy/smoky)
- Volumetric effects: god rays, atmosphere haze
- Weather conditions (if applicable)
- Time of day indicators

## TEXTURES & MATERIALS
- Dominant surface types
- Material qualities: (rough/smooth/reflective/matte)
- Wear and age indicators

## ENVIRONMENT DETAILS
- Setting type and era
- Architectural style (if applicable)
- Props and set dressing
- Background depth layers

Output as structured JSON for environment reconstruction.
`;

const STYLE_ANALYSIS_PROMPT = `
AESTHETIC_EXTRACTION_PROTOCOL

Extract exact visual style specifications for consistent generation.

## PHOTOGRAPHIC STYLE
- Camera system: (digital/film) with estimated format (35mm/medium/large)
- Lens characteristics: focal length, distortion, vignette
- Film stock simulation: (if any) specific stock name
- Grain: presence, size, distribution

## COMPOSITION
- Rule application: (thirds/center/golden ratio)
- Leading lines
- Frame within frame
- Negative space usage
- Subject placement

## POST-PROCESSING
- Contrast: (flat/normal/punchy/crushed blacks)
- Highlight handling: (clipped/preserved/rolled off)
- Shadow detail: (lifted/natural/crushed)
- Clarity/sharpness level
- Split toning: shadows and highlights

## CINEMATIC LANGUAGE
- Shot type: (ECU/CU/MCU/MS/MLS/LS/ELS)
- Movement suggestion: (static/handheld/steadicam/crane)
- Genre indicators: (noir/blockbuster/indie/documentary)
- Reference films or photographers

## MOOD & TONE
- Emotional register
- Energy level: (contemplative/dynamic/tense)
- Narrative implication

Output as structured JSON for style replication.
`;

/**
 * Extract a forensic-level character anchor from a reference image
 * Uses comprehensive biometric analysis for zero-deviation face matching
 */
async function extractCharacterAnchor(
    ai: GoogleGenAI,
    imageData: FileData,
    name: string = 'Primary Character'
): Promise<CharacterAnchor> {
    const parts = [
        { inlineData: imageData.inlineData },
        { text: FACIAL_ANALYSIS_PROMPT }
    ];

    // Use a more capable model for detailed analysis and get free-form response
    // Then parse the structured data from it
    const response = await retryGeminiRequest<GenerateContentResponse>(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        // Section 1: Cranial Structure
                        faceShape: { type: Type.STRING },
                        faceLengthWidthRatio: { type: Type.STRING },
                        verticalThirdsBalance: { type: Type.STRING },
                        foreheadHeight: { type: Type.STRING },
                        foreheadSlope: { type: Type.STRING },
                        foreheadShape: { type: Type.STRING },
                        hairlineShape: { type: Type.STRING },
                        hairlineDetails: { type: Type.STRING },
                        jawAngle: { type: Type.STRING },
                        jawWidth: { type: Type.STRING },
                        chinShape: { type: Type.STRING },
                        chinProjection: { type: Type.STRING },
                        chinCleft: { type: Type.STRING },
                        cheekboneProminence: { type: Type.STRING },
                        cheekbonePosition: { type: Type.STRING },
                        cheekVolume: { type: Type.STRING },

                        // Section 2: Eyes
                        eyeShape: { type: Type.STRING },
                        eyeSize: { type: Type.STRING },
                        canthalTilt: { type: Type.STRING },
                        eyeSpacing: { type: Type.STRING },
                        upperLidType: { type: Type.STRING },
                        lidCreaseHeight: { type: Type.STRING },
                        lowerLidCondition: { type: Type.STRING },
                        tearTrough: { type: Type.STRING },
                        irisColor: { type: Type.STRING },
                        irisPattern: { type: Type.STRING },
                        limbalRing: { type: Type.STRING },
                        scleraDetails: { type: Type.STRING },
                        eyebrowShape: { type: Type.STRING },
                        eyebrowArchPosition: { type: Type.STRING },
                        eyebrowThickness: { type: Type.STRING },
                        eyebrowColor: { type: Type.STRING },
                        eyebrowSpacing: { type: Type.STRING },
                        browBoneProminence: { type: Type.STRING },

                        // Section 3: Nose
                        noseType: { type: Type.STRING },
                        noseLength: { type: Type.STRING },
                        noseWidth: { type: Type.STRING },
                        bridgeHeight: { type: Type.STRING },
                        bridgeProfile: { type: Type.STRING },
                        bridgeDeviation: { type: Type.STRING },
                        tipShape: { type: Type.STRING },
                        tipProjection: { type: Type.STRING },
                        tipRotation: { type: Type.STRING },
                        nostrilShape: { type: Type.STRING },
                        nostrilSize: { type: Type.STRING },
                        alarFlare: { type: Type.STRING },
                        columella: { type: Type.STRING },
                        nasolabialAngle: { type: Type.STRING },

                        // Section 4: Mouth
                        lipType: { type: Type.STRING },
                        upperLipThickness: { type: Type.STRING },
                        lowerLipThickness: { type: Type.STRING },
                        lipRatio: { type: Type.STRING },
                        lipWidth: { type: Type.STRING },
                        vermilionBorder: { type: Type.STRING },
                        cupidsBow: { type: Type.STRING },
                        philtrumDetails: { type: Type.STRING },
                        lipColor: { type: Type.STRING },
                        lipTexture: { type: Type.STRING },
                        mouthWidth: { type: Type.STRING },
                        commissurePosition: { type: Type.STRING },
                        lipAsymmetry: { type: Type.STRING },
                        nasolabialFolds: { type: Type.STRING },
                        marionetteLlines: { type: Type.STRING },

                        // Section 5: Skin
                        fitzpatrickType: { type: Type.STRING },
                        skinToneDescriptive: { type: Type.STRING },
                        skinUndertone: { type: Type.STRING },
                        poreVisibility: { type: Type.STRING },
                        skinTexture: { type: Type.STRING },
                        skinCondition: { type: Type.STRING },
                        marksAndMoles: { type: Type.STRING },
                        facialLines: { type: Type.STRING },
                        crowsFeet: { type: Type.STRING },
                        foreheadLines: { type: Type.STRING },
                        glabellarLines: { type: Type.STRING },

                        // Section 6: Hair
                        hairBaseColor: { type: Type.STRING },
                        hairDimension: { type: Type.STRING },
                        hairHighlights: { type: Type.STRING },
                        grayPercentage: { type: Type.STRING },
                        hairCurlPattern: { type: Type.STRING },
                        hairStrandThickness: { type: Type.STRING },
                        hairDensity: { type: Type.STRING },
                        hairLength: { type: Type.STRING },
                        hairCutStyle: { type: Type.STRING },
                        hairParting: { type: Type.STRING },
                        hairBangs: { type: Type.STRING },
                        facialHairType: { type: Type.STRING },
                        facialHairDetails: { type: Type.STRING },

                        // Section 7: Symmetry
                        overallSymmetry: { type: Type.STRING },
                        specificAsymmetries: { type: Type.ARRAY, items: { type: Type.STRING } },
                        eyeSymmetry: { type: Type.STRING },
                        browSymmetry: { type: Type.STRING },
                        nostrilSymmetry: { type: Type.STRING },
                        lipSymmetry: { type: Type.STRING },
                        jawSymmetry: { type: Type.STRING },

                        // Section 8: Expression
                        restingExpression: { type: Type.STRING },
                        eyeExpression: { type: Type.STRING },
                        mouthPosition: { type: Type.STRING },
                        expressionMarkers: { type: Type.STRING },

                        // Section 9: Distinctive Summary
                        topDistinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                        primaryIdentifier: { type: Type.STRING },
                        secondaryIdentifier: { type: Type.STRING },
                        tertiaryIdentifier: { type: Type.STRING },
                        highRiskDriftFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },

                        // Overall
                        comprehensiveDescription: { type: Type.STRING }
                    },
                    required: [
                        'faceShape', 'eyeShape', 'irisColor', 'noseType', 'lipType',
                        'skinToneDescriptive', 'hairBaseColor', 'topDistinctiveFeatures',
                        'primaryIdentifier', 'comprehensiveDescription'
                    ]
                }
            }
        })
    );

    const a = JSON.parse(response.text || '{}');

    // Build the most comprehensive anchor text possible for prompt injection
    const fullAnalysis = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  BIOMETRIC IDENTITY ANCHOR — ${name.toUpperCase()}
║  Generated: ${new Date().toISOString()}
║  Protocol: FORENSIC_RECONSTRUCTION_V4
╚══════════════════════════════════════════════════════════════════════════════╝

▓▓▓ SECTION 1: CRANIAL ARCHITECTURE ▓▓▓
Face Shape: ${a.faceShape}
Face Proportions: ${a.faceLengthWidthRatio || 'standard'} length-to-width ratio
Vertical Balance: ${a.verticalThirdsBalance || 'balanced thirds'}

FOREHEAD:
- Height: ${a.foreheadHeight || 'medium'}
- Slope: ${a.foreheadSlope || 'slight'}
- Shape: ${a.foreheadShape || 'smooth'}

HAIRLINE:
- Shape: ${a.hairlineShape || 'natural'}
- Details: ${a.hairlineDetails || 'standard'}

JAWLINE & CHIN:
- Jaw Angle: ${a.jawAngle || 'moderate'}
- Jaw Width: ${a.jawWidth || 'proportional'}
- Chin Shape: ${a.chinShape || 'rounded'}
- Chin Projection: ${a.chinProjection || 'neutral'}
- Chin Cleft: ${a.chinCleft || 'none'}

CHEEKBONES:
- Prominence: ${a.cheekboneProminence || 'moderate'}
- Position: ${a.cheekbonePosition || 'mid-face'}
- Cheek Volume: ${a.cheekVolume || 'normal'}

▓▓▓ SECTION 2: PERIORBITAL REGION (EYES) ▓▓▓
EYE GEOMETRY:
- Shape: ${a.eyeShape}
- Size: ${a.eyeSize || 'medium'}
- Canthal Tilt: ${a.canthalTilt || 'neutral'}
- Spacing: ${a.eyeSpacing || 'average'}

EYELIDS:
- Upper Lid: ${a.upperLidType || 'visible crease'}
- Crease Height: ${a.lidCreaseHeight || 'medium'}
- Lower Lid: ${a.lowerLidCondition || 'smooth'}
- Tear Trough: ${a.tearTrough || 'minimal'}

IRIS FORENSICS [CRITICAL]:
- Color: ${a.irisColor}
- Pattern: ${a.irisPattern || 'standard'}
- Limbal Ring: ${a.limbalRing || 'present'}
- Sclera: ${a.scleraDetails || 'white, healthy'}

EYEBROWS [CRITICAL]:
- Shape: ${a.eyebrowShape || 'natural arch'}
- Arch Position: ${a.eyebrowArchPosition || 'middle'}
- Thickness: ${a.eyebrowThickness || 'medium'}
- Color: ${a.eyebrowColor || 'matches hair'}
- Spacing from Eyes: ${a.eyebrowSpacing || 'standard'}
- Brow Bone: ${a.browBoneProminence || 'subtle'}

▓▓▓ SECTION 3: NASAL ARCHITECTURE ▓▓▓
NOSE TYPE: ${a.noseType}
DIMENSIONS:
- Length: ${a.noseLength || 'proportional'}
- Width: ${a.noseWidth || 'medium'}

BRIDGE:
- Height: ${a.bridgeHeight || 'medium'}
- Profile: ${a.bridgeProfile || 'straight'}
- Deviation: ${a.bridgeDeviation || 'none'}

TIP:
- Shape: ${a.tipShape || 'rounded'}
- Projection: ${a.tipProjection || 'normal'}
- Rotation: ${a.tipRotation || 'neutral'}

NOSTRILS & BASE:
- Nostril Shape: ${a.nostrilShape || 'oval'}
- Nostril Size: ${a.nostrilSize || 'medium'}
- Alar Flare: ${a.alarFlare || 'minimal'}
- Columella: ${a.columella || 'straight'}
- Nasolabial Angle: ${a.nasolabialAngle || 'normal'}

▓▓▓ SECTION 4: ORAL & PERIORAL ▓▓▓
LIP SPECIFICATIONS [CRITICAL]:
- Type: ${a.lipType}
- Upper Lip: ${a.upperLipThickness || 'medium'}
- Lower Lip: ${a.lowerLipThickness || 'medium'}
- Ratio: ${a.lipRatio || 'balanced'}
- Width: ${a.lipWidth || 'proportional'}
- Vermilion Border: ${a.vermilionBorder || 'defined'}

UPPER LIP DETAIL:
- Cupid's Bow: ${a.cupidsBow || 'defined'}
- Philtrum: ${a.philtrumDetails || 'visible columns'}

COLOR & TEXTURE:
- Lip Color: ${a.lipColor || 'natural pink'}
- Lip Texture: ${a.lipTexture || 'smooth'}

MOUTH:
- Width: ${a.mouthWidth || 'proportional'}
- Commissures: ${a.commissurePosition || 'neutral'}
- Asymmetry: ${a.lipAsymmetry || 'minimal'}

PERIORAL LINES:
- Nasolabial Folds: ${a.nasolabialFolds || 'faint'}
- Marionette Lines: ${a.marionetteLlines || 'none'}

▓▓▓ SECTION 5: SKIN ANALYSIS ▓▓▓
TONE [CRITICAL]:
- Fitzpatrick Type: ${a.fitzpatrickType || 'III'}
- Descriptive: ${a.skinToneDescriptive}
- Undertone: ${a.skinUndertone || 'neutral'}

TEXTURE:
- Pores: ${a.poreVisibility || 'fine'}
- Surface: ${a.skinTexture || 'smooth'}
- Condition: ${a.skinCondition || 'healthy'}

MARKS & IDENTIFYING FEATURES [CRITICAL FOR IDENTITY]:
${a.marksAndMoles || 'No distinctive marks noted'}

FACIAL LINES:
- Forehead: ${a.foreheadLines || 'none'}
- Glabellar (11s): ${a.glabellarLines || 'none'}
- Crow's Feet: ${a.crowsFeet || 'none'}
- Overall: ${a.facialLines || 'minimal'}

▓▓▓ SECTION 6: HAIR FORENSICS ▓▓▓
COLOR [CRITICAL]:
- Base: ${a.hairBaseColor}
- Dimension: ${a.hairDimension || 'natural'}
- Highlights: ${a.hairHighlights || 'none'}
- Gray: ${a.grayPercentage || '0%'}

TEXTURE:
- Curl Pattern: ${a.hairCurlPattern || 'straight'}
- Strand Thickness: ${a.hairStrandThickness || 'medium'}
- Density: ${a.hairDensity || 'medium'}

CURRENT STYLE:
- Length: ${a.hairLength || 'medium'}
- Cut: ${a.hairCutStyle || 'layered'}
- Parting: ${a.hairParting || 'natural'}
- Bangs: ${a.hairBangs || 'none'}

FACIAL HAIR:
- Type: ${a.facialHairType || 'none'}
- Details: ${a.facialHairDetails || 'N/A'}

▓▓▓ SECTION 7: SYMMETRY ANALYSIS ▓▓▓
Overall Symmetry: ${a.overallSymmetry || 'high'}

SPECIFIC ASYMMETRIES [IDENTITY MARKERS]:
${(a.specificAsymmetries || []).map((asym: string, i: number) => `${i + 1}. ${asym}`).join('\n') || 'Minor natural asymmetries only'}

Feature Symmetry:
- Eyes: ${a.eyeSymmetry || 'symmetric'}
- Brows: ${a.browSymmetry || 'symmetric'}
- Nostrils: ${a.nostrilSymmetry || 'symmetric'}
- Lips: ${a.lipSymmetry || 'symmetric'}
- Jaw: ${a.jawSymmetry || 'symmetric'}

▓▓▓ SECTION 8: EXPRESSION BASELINE ▓▓▓
- Resting Expression: ${a.restingExpression || 'neutral'}
- Eye Expression: ${a.eyeExpression || 'alert'}
- Mouth Position: ${a.mouthPosition || 'closed'}
- Expression Markers: ${a.expressionMarkers || 'none'}

╔══════════════════════════════════════════════════════════════════════════════╗
║  ★★★ CRITICAL IDENTITY ANCHORS ★★★
╚══════════════════════════════════════════════════════════════════════════════╝

TOP 5 DISTINCTIVE FEATURES [MUST PRESERVE]:
${(a.topDistinctiveFeatures || []).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n') || '1. See comprehensive description'}

PRIMARY IDENTIFIER: ${a.primaryIdentifier || a.comprehensiveDescription?.substring(0, 100)}
SECONDARY IDENTIFIER: ${a.secondaryIdentifier || 'See above'}
TERTIARY IDENTIFIER: ${a.tertiaryIdentifier || 'See above'}

HIGH-RISK DRIFT FEATURES [MONITOR CLOSELY]:
${(a.highRiskDriftFeatures || []).map((f: string, i: number) => `⚠️ ${f}`).join('\n') || '⚠️ Eye spacing\n⚠️ Nose tip angle\n⚠️ Lip fullness ratio'}

╔══════════════════════════════════════════════════════════════════════════════╗
║  COMPREHENSIVE IDENTITY SUMMARY
╚══════════════════════════════════════════════════════════════════════════════╝
${a.comprehensiveDescription}

═══════════════════════════════════════════════════════════════════════════════
ENFORCEMENT DIRECTIVE: Any generated image MUST match ALL specifications above.
Deviation from ANY critical field constitutes identity failure.
Cross-reference against this anchor before finalizing any generation.
═══════════════════════════════════════════════════════════════════════════════
    `.trim();

    // Create thumbnail for visual reference
    const thumbData = `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;

    return {
        id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        faceShape: a.faceShape,
        eyeDescription: `${a.eyeShape} eyes, ${a.irisColor}, ${a.canthalTilt || 'neutral'} tilt, ${a.eyeSpacing || 'average'} spacing. Lids: ${a.upperLidType || 'creased'}. Brows: ${a.eyebrowShape || 'natural'}, ${a.eyebrowThickness || 'medium'}`,
        noseDescription: `${a.noseType} nose. Bridge: ${a.bridgeHeight || 'medium'} height, ${a.bridgeProfile || 'straight'}. Tip: ${a.tipShape || 'rounded'}, ${a.tipRotation || 'neutral'}. Nostrils: ${a.nostrilShape || 'oval'}, ${a.alarFlare || 'minimal'} flare`,
        mouthDescription: `${a.lipType} lips. Upper: ${a.upperLipThickness || 'medium'}. Lower: ${a.lowerLipThickness || 'medium'}. Cupid's bow: ${a.cupidsBow || 'defined'}. Color: ${a.lipColor || 'natural'}. Commissures: ${a.commissurePosition || 'neutral'}`,
        skinTone: `${a.skinToneDescriptive} (Fitzpatrick ${a.fitzpatrickType || 'III'}), ${a.skinUndertone || 'neutral'} undertone. Texture: ${a.skinTexture || 'smooth'}. Marks: ${a.marksAndMoles || 'none noted'}`,
        hairDescription: `${a.hairBaseColor} hair, ${a.hairCurlPattern || 'straight'} pattern, ${a.hairDensity || 'medium'} density. Style: ${a.hairLength || 'medium'} length, ${a.hairCutStyle || 'layered'}, parted ${a.hairParting || 'naturally'}. ${a.facialHairType !== 'none' && a.facialHairType ? `Facial hair: ${a.facialHairType}, ${a.facialHairDetails}` : ''}`,
        distinctiveFeatures: a.topDistinctiveFeatures || [],
        fullAnalysis,
        referenceThumb: thumbData,
        createdAt: Date.now()
    };
}

/**
 * Extract world/environment specifications
 */
async function extractWorldAnchor(ai: GoogleGenAI, imageData: FileData): Promise<string> {
    const parts = [
        { inlineData: imageData.inlineData },
        { text: WORLD_ANALYSIS_PROMPT }
    ];

    const response = await retryGeminiRequest<GenerateContentResponse>(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        })
    );

    return response.text || '';
}

/**
 * Extract style specifications
 */
async function extractStyleAnchor(ai: GoogleGenAI, imageData: FileData): Promise<string> {
    const parts = [
        { inlineData: imageData.inlineData },
        { text: STYLE_ANALYSIS_PROMPT }
    ];

    const response = await retryGeminiRequest<GenerateContentResponse>(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        })
    );

    return response.text || '';
}

/**
 * Build the continuity injection prompt from all anchors
 */
function buildContinuityPrompt(
    productionBible: ProductionBible | null,
    characterAnchors?: CharacterAnchor[]
): string {
    if (!productionBible && (!characterAnchors || characterAnchors.length === 0)) {
        return '';
    }

    let continuityBlock = '\n\n═══════════════════════════════════════════════════════════════\nCONTINUITY_LOCK_PROTOCOL_V3 - MANDATORY ADHERENCE\n═══════════════════════════════════════════════════════════════\n';

    // Character anchors are highest priority for identity preservation
    const allAnchors = characterAnchors || productionBible?.characterAnchors || [];
    if (allAnchors.length > 0) {
        continuityBlock += '\n### CHARACTER IDENTITY LOCK ###\n';
        continuityBlock += 'CRITICAL: The following character specifications MUST be exactly replicated.\n';
        continuityBlock += 'ANY deviation from these biometric anchors is a FAILURE condition.\n\n';

        allAnchors.forEach((anchor, idx) => {
            continuityBlock += `CHARACTER_${idx + 1} [${anchor.name}]:\n`;
            continuityBlock += anchor.fullAnalysis + '\n\n';
        });

        continuityBlock += 'ENFORCEMENT: Cross-reference all facial features against anchors before finalizing.\n';
    }

    // World/environment continuity
    if (productionBible?.worldDescription) {
        continuityBlock += '\n### ENVIRONMENT CONTINUITY ###\n';
        continuityBlock += productionBible.worldDescription + '\n';
    }

    // Style continuity
    if (productionBible?.styleDescription) {
        continuityBlock += '\n### STYLE CONTINUITY ###\n';
        continuityBlock += productionBible.styleDescription + '\n';
    }

    // Production bible overrides
    if (productionBible) {
        continuityBlock += '\n### PRODUCTION BIBLE ###\n';
        continuityBlock += `THEME: ${productionBible.theme}\n`;
        continuityBlock += `ATMOSPHERE: ${productionBible.atmosphere}\n`;
        continuityBlock += `VISUAL_LOGIC: ${productionBible.visualLogic}\n`;
        continuityBlock += `OPTIC_PROFILE: ${productionBible.opticProfile}\n`;
        if (productionBible.cinematicNotes.length > 0) {
            continuityBlock += `CINEMATIC_NOTES: ${productionBible.cinematicNotes.join(' | ')}\n`;
        }
    }

    continuityBlock += '\n═══════════════════════════════════════════════════════════════\n';

    return continuityBlock;
}

const ImageGen: React.FC<ImageGenProps> = ({ className, style }) => {
    const imageGen = useAppStore(s => s.imageGen);
    const actions = useAppStore(s => s.actions);

    const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'SUBSTRATE' | 'TEASER'>('SINGLE');

    // Cinematic Production State
    const [productionBible, setProductionBible] = useState<ProductionBible | null>(null);
    const [isSynthesizingBible, setIsSynthesizingBible] = useState(false);

    // Storyboard State
    const [frames, setFrames] = useState<Frame[]>([]);
    const [isBatchRendering, setIsBatchRendering] = useState(false);
    const [isPlanning, setIsPlanning] = useState(false);

    // View Layers
    const [viewLayer, setViewLayer] = useState<ViewLayer>('NORMAL');

    // Screening Room State
    const [teaserIdx, setTeaserIdx] = useState(0);
    const [isGeneratingTeaserAudio, setIsGeneratingTeaserAudio] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [isExportingBundle, setIsExportingBundle] = useState(false);

    // Video State
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoRes, setVideoRes] = useState<'720p' | '1080p'>('1080p');
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoProgressMsg, setVideoProgressMsg] = useState('');
    const [videoMotionBias, setVideoMotionBias] = useState(50);

    const checkApiKey = async () => {
        const hasKey = apiKeyService.hasGeminiKey();
        if (!hasKey) {
            await promptSelectKey();
            return false;
        }
        return true;
    };

    const downloadAsset = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        audio.playSuccess();
    };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const dataPromises = files.map(file => fileToGenerativePart(file));
            const newDatas = await Promise.all(dataPromises);

            if (type === 'CHAR') actions.setImageGenState({ characterRefs: [...imageGen.characterRefs, ...newDatas] });
            if (type === 'SET') actions.setImageGenState({ worldRefs: [...imageGen.worldRefs, ...newDatas] });
            if (type === 'STYLE') actions.setImageGenState({ styleRefs: [...imageGen.styleRefs, ...newDatas] });

            audio.playClick();
            actions.addLog('INFO', `ASSET_LOAD: Added ${newDatas.length} references to ${type} buffer.`);
        }
    };

    const removeRef = (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => {
        if (type === 'CHAR') actions.setImageGenState({ characterRefs: imageGen.characterRefs.filter((_, i) => i !== idx) });
        if (type === 'SET') actions.setImageGenState({ worldRefs: imageGen.worldRefs.filter((_, i) => i !== idx) });
        if (type === 'STYLE') actions.setImageGenState({ styleRefs: imageGen.styleRefs.filter((_, i) => i !== idx) });
    };

    const synthesizeProductionBible = async () => {
        if (imageGen.characterRefs.length === 0 && imageGen.worldRefs.length === 0 && imageGen.styleRefs.length === 0) return;
        setIsSynthesizingBible(true);
        actions.addLog('SYSTEM', 'PRODUCTION_BIBLE: Executing CONTINUITY_PROTOCOL_V3 - Maximum fidelity extraction...');

        try {
            if (!(await checkApiKey())) { setIsSynthesizingBible(false); return; }
            const ai = getAI();

            // ============================================================
            // PHASE 1: Extract Character Anchors (Biometric Forensics)
            // ============================================================
            const characterAnchors: CharacterAnchor[] = [];
            if (imageGen.characterRefs.length > 0) {
                actions.addLog('SYSTEM', `BIOMETRIC_SCAN: Extracting ${imageGen.characterRefs.length} character anchor(s)...`);

                for (let i = 0; i < imageGen.characterRefs.length; i++) {
                    const ref = imageGen.characterRefs[i];
                    try {
                        const anchor = await extractCharacterAnchor(ai, ref, `Character_${i + 1}`);
                        characterAnchors.push(anchor);
                        actions.addLog('INFO', `ANCHOR_LOCKED: ${anchor.name} - ${anchor.faceShape} face, ${anchor.eyeDescription}`);
                    } catch (e: any) {
                        actions.addLog('WARN', `ANCHOR_PARTIAL: Character ${i + 1} extraction incomplete: ${e.message}`);
                    }
                }
            }

            // ============================================================
            // PHASE 2: Extract World/Environment Anchors
            // ============================================================
            let worldDescription = '';
            if (imageGen.worldRefs.length > 0) {
                actions.addLog('SYSTEM', 'ENVIRONMENT_SCAN: Extracting world continuity anchors...');
                const worldAnalyses: string[] = [];

                for (const ref of imageGen.worldRefs) {
                    try {
                        const analysis = await extractWorldAnchor(ai, ref);
                        worldAnalyses.push(analysis);
                    } catch (e) {
                        // Continue with partial data
                    }
                }

                if (worldAnalyses.length > 0) {
                    worldDescription = worldAnalyses.join('\n\n---\n\n');
                }
            }

            // ============================================================
            // PHASE 3: Extract Style Anchors
            // ============================================================
            let styleDescription = '';
            if (imageGen.styleRefs.length > 0) {
                actions.addLog('SYSTEM', 'AESTHETIC_SCAN: Extracting style continuity anchors...');
                const styleAnalyses: string[] = [];

                for (const ref of imageGen.styleRefs) {
                    try {
                        const analysis = await extractStyleAnchor(ai, ref);
                        styleAnalyses.push(analysis);
                    } catch (e) {
                        // Continue with partial data
                    }
                }

                if (styleAnalyses.length > 0) {
                    styleDescription = styleAnalyses.join('\n\n---\n\n');
                }
            }

            // ============================================================
            // PHASE 4: Synthesize Production Bible
            // ============================================================
            actions.addLog('SYSTEM', 'BIBLE_SYNTHESIS: Combining all anchors into unified production bible...');

            const parts: any[] = [];

            if (imageGen.characterRefs.length > 0) {
                parts.push({ text: "IDENTITY REFERENCE VECTORS:" });
                imageGen.characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (imageGen.worldRefs.length > 0) {
                parts.push({ text: "WORLD/ENVIRONMENT REFERENCE VECTORS:" });
                imageGen.worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }
            if (imageGen.styleRefs.length > 0) {
                parts.push({ text: "AESTHETIC/STYLE REFERENCE VECTORS:" });
                imageGen.styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
            }

            parts.push({ text: "Synthesize a comprehensive Production Bible for this film series. Ensure extreme realism and consistent theme application. Output JSON {theme, atmosphere, visualLogic, narrativeArc, opticProfile, cinematicNotes[]}." });

            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            theme: { type: Type.STRING },
                            atmosphere: { type: Type.STRING },
                            visualLogic: { type: Type.STRING },
                            narrativeArc: { type: Type.STRING },
                            opticProfile: { type: Type.STRING },
                            cinematicNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['theme', 'atmosphere', 'visualLogic', 'narrativeArc', 'opticProfile', 'cinematicNotes']
                    }
                }
            }));

            const baseBible = JSON.parse(response.text || '{}');

            // Combine all data into the full production bible
            const fullBible: ProductionBible = {
                ...baseBible,
                characterAnchors: characterAnchors.length > 0 ? characterAnchors : undefined,
                worldDescription: worldDescription || undefined,
                styleDescription: styleDescription || undefined
            };

            setProductionBible(fullBible);

            // Log summary
            const anchorCount = characterAnchors.length;
            const worldAnchors = imageGen.worldRefs.length;
            const styleAnchors = imageGen.styleRefs.length;
            actions.addLog('SUCCESS', `PRODUCTION_BIBLE_V3: Locked with ${anchorCount} character anchor(s), ${worldAnchors} world ref(s), ${styleAnchors} style ref(s).`);
            actions.addLog('INFO', `CONTINUITY_READY: All generations will now enforce biometric + environmental + style consistency.`);
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `SCAN_FAIL: ${err.message}`);
        } finally {
            setIsSynthesizingBible(false);
        }
    };

    const generateSingleImage = async () => {
        if (!imageGen.prompt?.trim() && imageGen.characterRefs.length === 0) return;
        if (!(await checkApiKey())) return;

        actions.setImageGenState({ isLoading: true, error: null });
        audio.playClick();

        try {
            const ai = getAI();

            // ============================================================
            // PHASE 1: Build Base Prompt with Production Bible Context
            // ============================================================
            const contextualPrompt = productionBible
                ? `PRODUCTION_BIBLE_CONTEXT: ${productionBible.theme}. OPTICS: ${productionBible.opticProfile}. AESTHETIC: ${productionBible.visualLogic}. DIRECTIVE: ${imageGen.prompt}`
                : imageGen.prompt;

            let basePrompt = await constructCinematicPrompt(
                contextualPrompt || "A cinematic still shot on 35mm.",
                (imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY) as any,
                imageGen.characterRefs.length > 0,
                imageGen.worldRefs.length > 0,
                imageGen.styleRefs.length > 0,
                productionBible?.cinematicNotes.join(' '),
                imageGen.activeStylePreset
            );

            // ============================================================
            // PHASE 2: Inject Full Continuity Protocol
            // ============================================================
            const continuityInjection = buildContinuityPrompt(productionBible, productionBible?.characterAnchors);

            if (continuityInjection) {
                basePrompt += continuityInjection;
                actions.addLog('INFO', 'CONTINUITY_LOCK: Biometric anchors and style constraints injected into generation prompt.');
            }

            const allRefs = [...imageGen.characterRefs, ...imageGen.worldRefs, ...imageGen.styleRefs];

            // ============================================================
            // PHASE 3: Try Gemini Native (Direct Reference Preservation)
            // ============================================================
            if (allRefs.length > 0) {
                actions.addLog('SYSTEM', 'OPTIC_LINK: Attempting native multimodal synthesis with direct reference anchoring...');

                try {
                    // Character refs first for identity priority
                    const parts: any[] = [];

                    // Add character refs with explicit labeling
                    if (imageGen.characterRefs.length > 0) {
                        parts.push({ text: '=== PRIMARY IDENTITY REFERENCES (MUST MATCH EXACTLY) ===' });
                        imageGen.characterRefs.forEach((r, i) => {
                            parts.push({ text: `[CHARACTER_${i + 1}_FACE_REFERENCE]` });
                            parts.push({ inlineData: r.inlineData });
                        });
                    }

                    // Add world refs
                    if (imageGen.worldRefs.length > 0) {
                        parts.push({ text: '=== ENVIRONMENT REFERENCES ===' });
                        imageGen.worldRefs.forEach(r => parts.push({ inlineData: r.inlineData }));
                    }

                    // Add style refs
                    if (imageGen.styleRefs.length > 0) {
                        parts.push({ text: '=== STYLE REFERENCES ===' });
                        imageGen.styleRefs.forEach(r => parts.push({ inlineData: r.inlineData }));
                    }

                    // Add the enhanced prompt last
                    parts.push({ text: basePrompt });

                    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: {
                            responseModalities: ['IMAGE', 'TEXT'],
                            imageDimensions: {
                                aspectRatio: imageGen.aspectRatio
                            }
                        } as any
                    }));

                    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                    if (imagePart?.inlineData) {
                        const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        actions.setImageGenState({ generatedImage: { url, prompt: basePrompt, aspectRatio: imageGen.aspectRatio, size: imageGen.quality }, isLoading: false });
                        actions.addLog('SUCCESS', `ASSET_STUDIO: Render finalized via Gemini Native (CONTINUITY_V3 enforced).`);
                        audio.playSuccess();
                        return;
                    }
                } catch (e) {
                    actions.addLog('INFO', 'Native synthesis unavailable, falling back to Imagen with enhanced continuity context...');
                }

                // ============================================================
                // PHASE 4: Fallback - Enhanced Analysis for Imagen
                // ============================================================
                // If we don't have character anchors yet, extract them now
                if (!productionBible?.characterAnchors && imageGen.characterRefs.length > 0) {
                    actions.addLog('SYSTEM', 'FALLBACK_EXTRACTION: Building character anchors for Imagen pipeline...');

                    for (let i = 0; i < imageGen.characterRefs.length; i++) {
                        try {
                            const anchor = await extractCharacterAnchor(ai, imageGen.characterRefs[i], `Subject_${i + 1}`);
                            basePrompt += `\n\n${anchor.fullAnalysis}`;
                        } catch (e) {
                            // Continue with partial data
                        }
                    }
                }

                // Enhanced world/style analysis for non-character refs
                if (imageGen.worldRefs.length > 0 || imageGen.styleRefs.length > 0) {
                    const otherRefs = [...imageGen.worldRefs, ...imageGen.styleRefs];
                    const analysisParts: any[] = otherRefs.map(r => ({ inlineData: r.inlineData }));
                    analysisParts.push({ text: "Analyze these reference images for environment and style consistency. Describe lighting, color palette, textures, mood, composition, camera characteristics, and post-processing style in extreme detail." });

                    const analysis = await retryGeminiRequest(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: analysisParts }
                    }));

                    if (analysis.text) {
                        basePrompt += `\n\nENVIRONMENT_STYLE_SPECIFICATION: ${analysis.text}`;
                    }
                }

                actions.addLog('INFO', 'OPTIC_LINK: Full continuity context merged into Imagen synthesis vector.');
            }

            // ============================================================
            // PHASE 5: Imagen 4.0 Generation
            // ============================================================
            const model = imageGen.quality === ImageSize.SIZE_1K ? 'imagen-4.0-fast-generate-001' : 'imagen-4.0-generate-001';

            const response = await ai.models.generateImages({
                model,
                prompt: basePrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: imageGen.aspectRatio as any
                }
            });

            const generatedImage = response.generatedImages?.[0]?.image;

            if (generatedImage) {
                const url = `data:${generatedImage.mimeType};base64,${generatedImage.imageBytes}`;
                actions.setImageGenState({ generatedImage: { url, prompt: basePrompt, aspectRatio: imageGen.aspectRatio, size: imageGen.quality }, isLoading: false });
                actions.addLog('SUCCESS', `ASSET_STUDIO: Render finalized via Imagen 4 (CONTINUITY_V3 text-anchored).`);
                audio.playSuccess();
            } else {
                throw new Error("Empty buffer from cinematic core.");
            }
        } catch (err: any) {
            actions.setImageGenState({ error: err.message, isLoading: false });
            actions.addLog('ERROR', `RENDER_FAIL: ${err.message}`);
            audio.playError();
        }
    };

    const handlePlanSequence = async () => {
        if (!imageGen.prompt?.trim() && !productionBible) return;
        setIsPlanning(true);
        actions.addLog('SYSTEM', 'DIRECTOR: Forging narrative sequence timeline...');
        try {
            if (!(await checkApiKey())) { setIsPlanning(false); return; }

            const directorDirective = productionBible
                ? `THEME: ${productionBible.theme}. ARC: ${productionBible.narrativeArc}. STYLE: ${productionBible.visualLogic}. OPTICS: ${productionBible.opticProfile}. USER_INPUT: ${imageGen.prompt}`
                : imageGen.prompt;

            const plan = await generateStoryboardPlan(directorDirective);
            setFrames(plan.map((p, i) => ({
                index: i,
                scenePrompt: p.scenePrompt,
                continuity: p.continuity,
                camera: p.camera || 'Cinematic 35mm',
                lighting: p.lighting || 'Masterpiece Key-Light',
                status: 'pending'
            })));
            actions.addLog('SUCCESS', 'DIRECTOR: Timeline synchronized. Continuous logic locked.');
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `PLAN_FAIL: ${err.message}`);
        } finally {
            setIsPlanning(false);
        }
    };

    const renderFrame = async (idx: number) => {
        const frame = frames[idx];
        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'generating' } : f));

        try {
            const ai = getAI();
            const model = imageGen.quality === ImageSize.SIZE_1K ? 'imagen-4.0-fast-generate-001' : 'imagen-4.0-generate-001';

            const resCurve = imageGen.resonanceCurve?.[idx];
            const resonance = resCurve
                ? `[Intensity: ${resCurve.tension}%] [Texture: ${resCurve.dynamics}%]`
                : "";

            let finalPrompt = await constructCinematicPrompt(
                `BIBLE: ${productionBible?.theme}. SCENE_${idx}: ${frame.scenePrompt} ${resonance}`,
                (imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY) as any,
                imageGen.characterRefs.length > 0,
                imageGen.worldRefs.length > 0,
                imageGen.styleRefs.length > 0,
                `CAM: ${frame.camera}. LITE: ${frame.lighting}. CONT: ${frame.continuity}`,
                imageGen.activeStylePreset
            );

            // ============================================================
            // CONTINUITY_V3: Inject character anchors for frame consistency
            // ============================================================
            const continuityInjection = buildContinuityPrompt(productionBible, productionBible?.characterAnchors);
            if (continuityInjection) {
                finalPrompt += continuityInjection;
            }

            // Add frame-specific continuity notes
            finalPrompt += `\n\n=== STORYBOARD CONTINUITY ===
FRAME_INDEX: ${idx + 1} of ${frames.length}
SCENE_CONTINUITY: ${frame.continuity}
CRITICAL: Character appearance MUST match previous frames exactly.
`;

            const allRefs = [...imageGen.characterRefs, ...imageGen.worldRefs, ...imageGen.styleRefs];

            // Try native Gemini first for better face preservation
            if (allRefs.length > 0) {
                try {
                    const parts: any[] = [];

                    // Character refs first with explicit labeling
                    if (imageGen.characterRefs.length > 0) {
                        parts.push({ text: '=== CHARACTER IDENTITY (MUST MATCH ALL FRAMES) ===' });
                        imageGen.characterRefs.forEach((r, i) => {
                            parts.push({ text: `[CHARACTER_${i + 1}]` });
                            parts.push({ inlineData: r.inlineData });
                        });
                    }

                    // Other refs
                    if (imageGen.worldRefs.length > 0) {
                        parts.push({ text: '=== ENVIRONMENT ===' });
                        imageGen.worldRefs.forEach(r => parts.push({ inlineData: r.inlineData }));
                    }
                    if (imageGen.styleRefs.length > 0) {
                        parts.push({ text: '=== STYLE ===' });
                        imageGen.styleRefs.forEach(r => parts.push({ inlineData: r.inlineData }));
                    }

                    parts.push({ text: finalPrompt });

                    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: {
                            responseModalities: ['IMAGE', 'TEXT'],
                            imageDimensions: {
                                aspectRatio: imageGen.aspectRatio
                            }
                        } as any
                    }));

                    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                    if (imagePart?.inlineData) {
                        const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: url, status: 'done' } : f));
                        return;
                    }
                } catch (e) {
                    // Fallback to Imagen
                }

                // Fallback: Use cached anchors or extract new ones
                if (productionBible?.characterAnchors) {
                    // Already have anchors in the continuity prompt
                } else {
                    // Quick analysis fallback
                    const analysisParts: any[] = allRefs.map(r => ({ inlineData: r.inlineData }));
                    analysisParts.push({ text: `Describe these references to help generate frame ${idx + 1}: ${frame.scenePrompt}` });

                    const analysis = await retryGeminiRequest(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: analysisParts }
                    }));
                    if (analysis.text) finalPrompt += `\n\nREF_GUIDE: ${analysis.text}`;
                }
            }

            // Imagen fallback
            const response = await ai.models.generateImages({
                model,
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: imageGen.aspectRatio as any
                }
            });

            const generatedImage = response.generatedImages?.[0]?.image;

            if (generatedImage) {
                const url = `data:${generatedImage.mimeType};base64,${generatedImage.imageBytes}`;
                setFrames(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: url, status: 'done' } : f));
            } else {
                throw new Error("Bitstream dropout.");
            }
        } catch (err: any) {
            setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
        }
    };

    const renderSequence = async () => {
        setIsBatchRendering(true);
        actions.addLog('SYSTEM', `STUDIO_RENDER: Initializing ${imageGen.quality === ImageSize.SIZE_1K ? 'FLASH' : 'CINEMATIC'} batch-process...`);

        const pendingFrames = frames.filter(f => f.status !== 'done');
        const isFlash = imageGen.quality === ImageSize.SIZE_1K;
        const batchSize = isFlash ? 3 : 1;

        for (let i = 0; i < pendingFrames.length; i += batchSize) {
            const batch = pendingFrames.slice(i, i + batchSize);
            await Promise.all(batch.map(f => renderFrame(f.index)));
            if (!isFlash) await new Promise(r => setTimeout(r, 1000));
        }
        setIsBatchRendering(false);
        actions.addLog('SUCCESS', 'STUDIO_RENDER: Sequence fabricated and archived.');
        audio.playSuccess();
    };

    const handleVideoGenerate = async () => {
        if (!videoPrompt.trim()) return;
        if (!(await checkApiKey())) return;

        setIsVideoLoading(true);
        setVideoUrl(null);
        setVideoProgressMsg("Priming VEO Temporal Handshake with CONTINUITY_V3...");
        actions.addLog('SYSTEM', 'VEO_CORE: Forging high-motion cinematic sequence with character continuity lock...');

        try {
            const ai = getAI();

            // ============================================================
            // PHASE 1: Build Video Directive with Full Continuity
            // ============================================================
            let veoDirective = '';

            // Base context from production bible
            if (productionBible) {
                veoDirective += `CINEMATIC_CONTEXT:
THEME: ${productionBible.theme}
ATMOSPHERE: ${productionBible.atmosphere}
VISUAL_LOGIC: ${productionBible.visualLogic}
OPTIC_PROFILE: ${productionBible.opticProfile}
`;

                // Inject character anchors for identity preservation in video
                if (productionBible.characterAnchors && productionBible.characterAnchors.length > 0) {
                    veoDirective += '\n=== CHARACTER IDENTITY LOCK (MAINTAIN THROUGHOUT VIDEO) ===\n';
                    productionBible.characterAnchors.forEach((anchor, idx) => {
                        veoDirective += `\nCHARACTER_${idx + 1} [${anchor.name}]:\n`;
                        veoDirective += `Face: ${anchor.faceShape}\n`;
                        veoDirective += `Eyes: ${anchor.eyeDescription}\n`;
                        veoDirective += `Nose: ${anchor.noseDescription}\n`;
                        veoDirective += `Mouth: ${anchor.mouthDescription}\n`;
                        veoDirective += `Skin: ${anchor.skinTone}\n`;
                        veoDirective += `Hair: ${anchor.hairDescription}\n`;
                        if (anchor.distinctiveFeatures.length > 0) {
                            veoDirective += `Distinctive: ${anchor.distinctiveFeatures.join(', ')}\n`;
                        }
                        veoDirective += `CRITICAL: This character's face MUST remain consistent across all frames.\n`;
                    });
                    veoDirective += '\n';
                }

                // World/style continuity
                if (productionBible.worldDescription) {
                    veoDirective += `\nENVIRONMENT_CONTINUITY:\n${productionBible.worldDescription.substring(0, 500)}\n`;
                }

                if (productionBible.styleDescription) {
                    veoDirective += `\nSTYLE_CONTINUITY:\n${productionBible.styleDescription.substring(0, 500)}\n`;
                }
            }

            // Add motion directive
            veoDirective += `\n=== MOTION DIRECTIVE ===
MOTION_INTENSITY: ${videoMotionBias}%
${videoMotionBias < 30 ? 'CAMERA_STYLE: Static or slow pan, minimal subject movement' :
videoMotionBias < 60 ? 'CAMERA_STYLE: Smooth tracking, natural subject movement' :
'CAMERA_STYLE: Dynamic camera work, energetic subject movement'}

=== SCENE DIRECTIVE ===
${videoPrompt}

=== QUALITY MANDATE ===
- Maintain character identity across ALL frames
- No face morphing or identity drift
- Consistent lighting throughout
- Cinematic motion blur, not artificial smoothing
- Resolution: ${videoRes}
`;

            // ============================================================
            // PHASE 2: Extract Character Anchor for First Frame
            // ============================================================
            const characterRef = imageGen.characterRefs[0];
            const characterImageForVeo = characterRef;

            // If we have character anchors but no direct ref, try to use the thumbnail
            if (!characterRef && productionBible?.characterAnchors?.[0]?.referenceThumb) {
                const thumbData = productionBible.characterAnchors[0].referenceThumb;
                const base64Data = thumbData.split(',')[1];
                const mimeType = thumbData.split(':')[1]?.split(';')[0] || 'image/jpeg';

                // VEO expects the reference image for character consistency
                actions.addLog('INFO', 'VEO_LINK: Using cached character anchor thumbnail for identity seeding.');
            }

            // ============================================================
            // PHASE 3: Generate Video with VEO
            // ============================================================
            setVideoProgressMsg("Initializing VEO with character identity lock...");

            let operation = await ai.models.generateVideos({
                model: 'veo-3.0-fast-generate',
                prompt: veoDirective,
                image: characterImageForVeo ? {
                    imageBytes: characterImageForVeo.inlineData.data,
                    mimeType: characterImageForVeo.inlineData.mimeType
                } : undefined,
                config: {
                    numberOfVideos: 1,
                    resolution: videoRes as any,
                    aspectRatio: '16:9'
                }
            });

            let progress = 0;
            while (!operation.done) {
                progress = Math.min(95, progress + Math.floor(Math.random() * 10 + 5));
                setVideoProgressMsg(`Temporal synthesis in progress... [${progress}%] - Enforcing character continuity`);
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            const response = await fetch(`${downloadLink}&key=${apiKeyService.getGeminiKey()}`);
            const blob = await response.blob();
            setVideoUrl(URL.createObjectURL(blob));

            const anchorCount = productionBible?.characterAnchors?.length || 0;
            actions.addLog('SUCCESS', `VEO_COMPLETE: Temporal sequence stabilized at ${videoRes} with ${anchorCount} character anchor(s) enforced.`);
            audio.playSuccess();
        } catch (err: any) {
            actions.addLog('ERROR', `VEO_FAIL: ${err.message}`);
            audio.playError();
        } finally {
            setIsVideoLoading(false);
        }
    };

    const exportProductionBundle = async () => {
        if (frames.filter(f => f.imageUrl).length === 0) return;
        setIsExportingBundle(true);
        const zip = new JSZip();
        const folder = zip.folder("production_bundle_v8");
        const audioFolder = folder?.folder("synthesized_audio");

        actions.addLog('SYSTEM', 'DELIVERY: Compiling encrypted production bundle...');

        for (const frame of frames) {
            if (frame.imageUrl) {
                try {
                    const response = await fetch(frame.imageUrl);
                    const blob = await response.blob();
                    folder?.file(`frame_${frame.index + 1}.png`, blob);

                    if (frame.audioUrl) {
                        const aRes = await fetch(frame.audioUrl);
                        const aBlob = await aRes.blob();
                        audioFolder?.file(`narration_${frame.index + 1}.pcm`, aBlob);
                    }
                } catch (e) { logger.error('Audio narration export failed', e); }
            }
        }

        if (productionBible) {
            folder?.file("production_bible.json", JSON.stringify(productionBible, null, 2));
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `cinema_bundle_${Date.now()}.zip`;
        link.click();
        actions.addLog('SUCCESS', 'DELIVERY: Production bundle archive exported.');
        audio.playSuccess();
        setIsExportingBundle(false);
    };

    const generateTeaserAudioForIndex = async (idx: number) => {
        const currentFrame = frames[idx];
        if (!currentFrame || !currentFrame.scenePrompt) return;

        actions.addLog('SYSTEM', `SOUND_STUDIO: Synthesizing narrative for Node_${idx + 1}...`);

        try {
            if (!(await checkApiKey())) return;
            const narrativeText = productionBible
                ? `In the cinematic world of ${productionBible.theme}, ${currentFrame.scenePrompt}`
                : currentFrame.scenePrompt;

            const { audioData } = await generateAudioOverview([{
                inlineData: { data: '', mimeType: 'text/plain' },
                name: narrativeText
            }]);

            if (audioData) {
                setFrames(prev => prev.map((f, i) => i === idx ? { ...f, audioUrl: `data:audio/pcm;base64,${audioData}` } : f));
                return `data:audio/pcm;base64,${audioData}`;
            }
        } catch (err: any) {
            actions.addLog('ERROR', `SOUND_FAIL_NODE_${idx + 1}: ${err.message}`);
        }
        return null;
    };

    const generateAllSequenceAudio = async () => {
        if (frames.length === 0) return;
        setIsGeneratingTeaserAudio(true);
        actions.addLog('SYSTEM', 'SOUND_STUDIO: Batch-synthesizing full sequence narration...');

        for (let i = 0; i < frames.length; i++) {
            if (frames[i].audioUrl) continue;
            await generateTeaserAudioForIndex(i);
            await new Promise(r => setTimeout(r, 500));
        }

        setIsGeneratingTeaserAudio(false);
        actions.addLog('SUCCESS', 'SOUND_STUDIO: Narration sequence synchronized.');
        audio.playSuccess();
    };

    const playFullSequence = async () => {
        if (frames.length === 0) return;
        setIsAutoPlaying(true);
        actions.addLog('SYSTEM', 'SCREENING: Initializing slideshow narrative playback...');

        for (let i = 0; i < frames.length; i++) {
            if (!isAutoPlaying && i > 0) break;
            setTeaserIdx(i);

            let audioUrl = frames[i].audioUrl;
            if (!audioUrl) {
                audioUrl = await generateTeaserAudioForIndex(i) || undefined;
            }

            if (audioUrl) {
                await new Promise(r => setTimeout(r, 6000));
            } else {
                await new Promise(r => setTimeout(r, 5000));
            }
        }
        setIsAutoPlaying(false);
        actions.addLog('SUCCESS', 'SCREENING: Slideshow finalized.');
    };

    const toggleViewLayer = (layer: ViewLayer) => {
        setViewLayer(prev => prev === layer ? 'NORMAL' : layer);
        audio.playClick();
    };

    return (
        <div
            className={`h-full w-full bg-[var(--bg-app)] flex flex-col border border-white/10 rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative z-10 font-sans group/studio ${className}`}
            style={{ ...style }}
        >
            {/* Cinematic Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-50 bg-[length:100%_4px] opacity-20" />

            {/* Global Studio Header */}
            <StudioHeader activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="flex-1 overflow-hidden relative z-10 flex h-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'SINGLE' && (
                        <SingleImageMode
                            imageGen={imageGen}
                            productionBible={productionBible}
                            isSynthesizingBible={isSynthesizingBible}
                            viewLayer={viewLayer}
                            onSynthesizeBible={synthesizeProductionBible}
                            onGenerateImage={generateSingleImage}
                            onToggleViewLayer={toggleViewLayer}
                            onRefUpload={handleRefUpload}
                            onRemoveRef={removeRef}
                            onDownloadAsset={downloadAsset}
                            onOpenHoloProjector={(data) => actions.openHoloProjector(data)}
                            onUpdatePrompt={(prompt) => actions.setImageGenState({ prompt })}
                            onUpdateAspectRatio={(ratio) => actions.setImageGenState({ aspectRatio: ratio })}
                            onUpdateQuality={(quality) => actions.setImageGenState({ quality })}
                        />
                    )}

                    {activeTab === 'STORYBOARD' && (
                        <StoryboardMode
                            prompt={imageGen.prompt}
                            quality={imageGen.quality}
                            productionBible={productionBible}
                            frames={frames}
                            isPlanning={isPlanning}
                            isBatchRendering={isBatchRendering}
                            onUpdatePrompt={(prompt) => actions.setImageGenState({ prompt })}
                            onUpdateQuality={(quality) => actions.setImageGenState({ quality })}
                            onPlanSequence={handlePlanSequence}
                            onRenderSequence={renderSequence}
                            onRenderFrame={renderFrame}
                            onExportBundle={exportProductionBundle}
                            onUpdateFramePrompt={(idx, prompt) => {
                                const n = [...frames];
                                n[idx].scenePrompt = prompt;
                                setFrames(n);
                            }}
                            onOpenHoloProjector={(data) => actions.openHoloProjector(data)}
                        />
                    )}

                    {activeTab === 'VIDEO' && (
                        <VideoMode
                            videoPrompt={videoPrompt}
                            setVideoPrompt={setVideoPrompt}
                            videoMotionBias={videoMotionBias}
                            setVideoMotionBias={setVideoMotionBias}
                            videoRes={videoRes}
                            setVideoRes={setVideoRes}
                            isVideoLoading={isVideoLoading}
                            videoProgressMsg={videoProgressMsg}
                            videoUrl={videoUrl}
                            onGenerateVideo={handleVideoGenerate}
                        />
                    )}

                    {activeTab === 'SUBSTRATE' && (
                        <CinemaStudio />
                    )}

                    {activeTab === 'TEASER' && (
                        <TeaserMode
                            frames={frames}
                            teaserIdx={teaserIdx}
                            setTeaserIdx={setTeaserIdx}
                            isAutoPlaying={isAutoPlaying}
                            setIsAutoPlaying={setIsAutoPlaying}
                            isGeneratingTeaserAudio={isGeneratingTeaserAudio}
                            isExportingBundle={isExportingBundle}
                            onPlayFullSequence={playFullSequence}
                            onGenerateAllAudio={generateAllSequenceAudio}
                            onGenerateAudioForIndex={generateTeaserAudioForIndex}
                            onExportBundle={exportProductionBundle}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Global Production Footer HUD */}
            <StudioFooter activeTab={activeTab} frameCount={frames.length} />
        </div>
    );
};

export default ImageGen;
