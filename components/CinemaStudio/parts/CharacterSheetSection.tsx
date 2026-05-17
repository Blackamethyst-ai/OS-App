// 5-frame NanoBanana character sheet generator. Cheap path that fills
// [Image1..5] with Gemini-generated identity-locked keyframes. Distinct from
// the 14-frame Maximum Character Sheet in SoulCastPanel.

import React from 'react';
import { Sparkles } from 'lucide-react';
import { generateCharacterSheet } from '../../../services/cinema/keyframe';
import { DICO_FACE_ANCHOR, DICO_STYLE_LINE } from '../../../services/cinema';
import { apiKeyService } from '../../../services/apiKeyService';
import type { RefRow } from './types';

export const CharacterSheetSection: React.FC<{
  refImages: RefRow[];
  setRefImages: React.Dispatch<React.SetStateAction<RefRow[]>>;
}> = ({ setRefImages }) => {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string>('');

  const onBuild = async () => {
    setBusy(true);
    setError(null);
    setProgress('Calling NanoBanana for 5-frame sheet...');
    try {
      const geminiKey = apiKeyService.getKey('gemini');
      if (!geminiKey) throw new Error('Gemini API key required (vault or VITE_GEMINI_API_KEY)');
      const sheet = await generateCharacterSheet(DICO_FACE_ANCHOR, {
        apiKey: geminiKey,
        sharedStylePrompt: DICO_STYLE_LINE,
        fast: true,
      });
      setRefImages(rs => {
        const sheetRows: RefRow[] = sheet.map(k => ({
          url: k.url,
          alias: k.role,
          source: 'ai_generated',
          isPersonLikeness: true,
        }));
        const rest = rs.slice(5);
        return [...sheetRows, ...rest].slice(0, 9);
      });
      setProgress(`✓ Built ${sheet.length} keyframes — slotted into [Image1..${sheet.length}]`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-fuchsia-950/20 to-cyan-950/20 border border-fuchsia-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-fuchsia-400" />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-fuchsia-300 flex-1">
          Build Character Sheet
        </h3>
      </div>
      <p className="text-[10px] text-gray-400 font-mono mb-3 leading-relaxed">
        Generates 5 keyframes from your canonical face anchor via NanoBanana
        (anchor portrait, two profiles, three-quarter body, wardrobe study) and
        slots them into [Image1..5]. Uses Gemini key. No fal cost.
      </p>
      <button
        onClick={onBuild}
        disabled={busy}
        className="w-full py-2 bg-fuchsia-600/30 border border-fuchsia-500/50 hover:bg-fuchsia-600/50 rounded-xl text-[10px] font-mono uppercase tracking-widest text-fuchsia-200 disabled:opacity-40 transition"
      >
        {busy ? 'Generating sheet…' : 'Build 5-frame sheet'}
      </button>
      {progress && <div className="text-[10px] text-cyan-300 font-mono mt-2">{progress}</div>}
      {error && <div className="text-[10px] text-red-400 font-mono mt-2 break-all">{error}</div>}
    </div>
  );
};
