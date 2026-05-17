// Cinema Studio — Soul Cast control panel.
//
// One panel ties everything together:
//   1. Pick / create / fork a Soul Cast (versioned identity)
//   2. Seed photos → 128d face descriptor (face-api.js)
//   3. Auto-curate from /anchor-library (walk + rank by similarity)
//   4. Generate Maximum Character Sheet (14 frames via NanoBanana Pro)
//   5. Active Soul → auto-fills [Image1..N] in the substrate composer
//
// Persistence: IndexedDB via cinema/soul service. Lives across sessions.

import React, { useCallback, useEffect, useState } from 'react';
import {
  User, Plus, Trash2, Star, Sparkles, ScanLine, Layers, RefreshCw,
  CheckCircle2, AlertCircle, Wand2, ImagePlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  listSouls, getActiveSoulId, setActiveSoulId, createSoul, deleteSoul,
  curateFromLibrary, generateMaximumCharacterSheet, topAnchors,
  DICO_WARDROBE, HERO_14,
} from '../../services/cinema';
import type { SoulCast, SoulAnchor } from '../../services/cinema';
import { apiKeyService } from '../../services/apiKeyService';

interface SoulCastPanelProps {
  onApplyAnchors: (
    anchors: { url: string; alias?: string; source?: 'real_photo' | 'ai_generated' | 'composite'; isPersonLikeness?: boolean }[],
  ) => void;
  onSoulActivated?: (soul: SoulCast | undefined) => void;
}

export const SoulCastPanel: React.FC<SoulCastPanelProps> = ({ onApplyAnchors, onSoulActivated }) => {
  const [souls, setSouls] = useState<SoulCast[]>([]);
  const [activeId, setActiveIdState] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<'create' | 'curate' | 'sheet' | undefined>(undefined);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSouls(await listSouls());
      setActiveIdState(await getActiveSoulId());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activeSoul = souls.find(s => s.id === activeId);
  useEffect(() => { onSoulActivated?.(activeSoul); }, [activeSoul, onSoulActivated]);

  // -------------------------------------------------------------------------
  const onActivate = async (id: string) => {
    await setActiveSoulId(id);
    await refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this Soul Cast?')) return;
    await deleteSoul(id);
    await refresh();
  };

  const onCurate = async () => {
    if (!activeSoul) return;
    setBusy('curate'); setError(null);
    try {
      setProgressMsg('Loading anchor library index…');
      const idx = await fetch('/anchor-library-index.json?t=' + Date.now())
        .then(r => r.json()) as Array<{ url: string; category?: string }>;
      setProgressMsg(`Walking ${idx.length} library images…`);
      await curateFromLibrary(activeSoul.id, idx, {
        onProgress: p => {
          setProgressMsg(`Scanning ${p.processed}/${p.total} · matched ${p.matched}`);
        },
        minMatchScore: 0.55,
        maxAnchors: 100,
      });
      setProgressMsg(`✓ Curate complete`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(undefined);
    }
  };

  const onGenerateSheet = async (useFalProvider = false) => {
    if (!activeSoul) return;
    const geminiKey = apiKeyService.getKey('gemini');
    const falKey = apiKeyService.getKey('fal');
    // Auto-fallback: if user hits Gemini button but key missing and fal key
    // present, prompt to switch.
    const provider: 'gemini' | 'fal' = useFalProvider
      ? 'fal'
      : (!geminiKey && falKey ? 'fal' : 'gemini');

    if (provider === 'gemini' && !geminiKey) {
      setError('Gemini API key required (vault or VITE_GEMINI_API_KEY). Try the FAL button if Gemini cap is hit.');
      return;
    }
    if (provider === 'fal' && !falKey) {
      setError('fal API key required to use Flux on fal (vault or VITE_FAL_API_KEY).');
      return;
    }

    setBusy('sheet'); setError(null);
    try {
      setProgressMsg(provider === 'fal' ? 'Spinning up Flux Pro Ultra on fal…' : 'Spinning up NanoBanana Pro…');
      const wardrobeRotation = ['signature-leather', 'signature-leather', 'sovereign-suit', 'all-black-tactical'];
      const sheet = await generateMaximumCharacterSheet({
        soul: activeSoul,
        provider,
        geminiApiKey: geminiKey,
        falApiKey: falKey,
        wardrobeRotation,
        quality: '2K',
        fast: false,
        onProgress: p => {
          setProgressMsg(`Frame ${p.completed}/${p.total} · ${p.currentLabel ?? ''}`);
        },
      });
      // Persist new frames as hero anchors on the Soul (data URLs).
      // source='ai_generated' tells the router these are safe to pass to
      // Seedance partner_validation IF needed — but face-lock routing still
      // prefers Kling because isPersonLikeness=true.
      const newAnchors: SoulAnchor[] = sheet.map(k => ({
        url: k.url,
        category: 'ai-generated',
        source: 'ai_generated',
        matchScore: 0.95,
        detectionScore: 1,
        hasFace: true,
        taggedAsHero: true,
        computedAt: k.generatedAt,
      }));
      // Naive merge — front-load new anchors before existing
      const updated: SoulCast = {
        ...activeSoul,
        anchors: [...newAnchors, ...activeSoul.anchors].slice(0, 100),
        trainCount: activeSoul.trainCount + 1,
        updatedAt: new Date().toISOString(),
      };
      // Save through soulCast.ts: piggyback via createSoul-style direct save
      const { openDB } = await import('idb');
      const db = await openDB('cinema-soul-cast', 1);
      await db.put('souls', updated);
      setProgressMsg(`✓ Generated ${sheet.length} frames`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(undefined);
    }
  };

  const onApplyToShot = () => {
    if (!activeSoul) return;
    const top = topAnchors(activeSoul, 5);
    onApplyAnchors(top.map(a => ({
      url: a.url,
      alias: 'soul-anchor',
      // Soul anchors come from the user's library — assume real_photo unless tagged.
      // The router uses isPersonLikeness=true to escape Seedance partner_validation.
      source: a.source ?? 'real_photo',
      isPersonLikeness: true,
    })));
  };

  // -------------------------------------------------------------------------

  return (
    <div className="bg-gradient-to-br from-violet-950/30 via-fuchsia-950/20 to-cyan-950/20 border border-violet-500/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-violet-500/20 border border-violet-400/40 rounded-lg">
          <User className="w-4 h-4 text-violet-300" />
        </div>
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-violet-300 flex-1">Soul Cast</h3>
        <button onClick={() => setShowCreate(true)}
          className="text-[10px] font-mono text-violet-300 hover:text-violet-200 flex items-center gap-1">
          <Plus className="w-3 h-3" /> NEW
        </button>
      </div>

      {showCreate && <CreateSoulForm onDone={async () => { setShowCreate(false); await refresh(); }} onCancel={() => setShowCreate(false)} setBusy={setBusy} setError={setError} setProgress={setProgressMsg} />}

      {/* Always-visible progress + error banner — shows during create AND active flows */}
      {(progressMsg || error) && (
        <div className="mb-2 space-y-1">
          {progressMsg && (
            <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-2">
              <motion.span animate={{ opacity: busy ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: busy ? Infinity : 0, duration: 1.5 }}>●</motion.span>
              {progressMsg}
            </div>
          )}
          {error && (
            <div className="text-[10px] font-mono text-red-400 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Soul list */}
      {souls.length === 0 && !showCreate && (
        <div className="text-[10px] font-mono text-gray-500 leading-relaxed">
          No souls yet. Click <span className="text-violet-300">+ NEW</span> and drop a few face refs to bootstrap one.
        </div>
      )}
      <div className="space-y-2">
        {souls.map(soul => (
          <SoulRow key={soul.id} soul={soul} active={soul.id === activeId}
            onActivate={() => onActivate(soul.id)} onDelete={() => onDelete(soul.id)} />
        ))}
      </div>

      {/* Active soul actions */}
      {activeSoul && (
        <div className="mt-4 pt-4 border-t border-violet-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-violet-300">
              Active: <span className="text-white">{activeSoul.name}</span>
            </div>
            <div className="text-[9px] font-mono text-gray-500">
              {activeSoul.anchors.length} anchors · v{activeSoul.version} · trained {activeSoul.trainCount}×
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SoulAction
              icon={<ScanLine className="w-3 h-3" />}
              label={activeSoul.trainCount > 1 ? "Re-scan library" : "Auto-curate library"}
              hint={`Walk the 1051-image library, rank by face match. Train count: ${activeSoul.trainCount}`}
              busy={busy === 'curate'}
              onClick={onCurate}
            />
            <SoulAction
              icon={<Wand2 className="w-3 h-3" />}
              label="Build Max Sheet"
              hint="Generate 14 frames via NanoBanana Pro (Gemini)"
              busy={busy === 'sheet'}
              onClick={() => onGenerateSheet(false)}
            />
            <SoulAction
              icon={<Wand2 className="w-3 h-3" />}
              label="Sheet (fal)"
              hint="Build via Flux Pro Ultra on fal — no Gemini cap"
              busy={busy === 'sheet'}
              onClick={() => onGenerateSheet(true)}
            />
            <SoulAction
              icon={<ImagePlus className="w-3 h-3" />}
              label="Apply to shot"
              hint="Auto-fill [Image1..5] with top anchors"
              onClick={onApplyToShot}
              variant="primary"
            />
          </div>

          {progressMsg && (
            <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-2">
              <motion.span animate={{ opacity: busy ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: busy ? Infinity : 0, duration: 1.5 }}>●</motion.span>
              {progressMsg}
            </div>
          )}
          {error && (
            <div className="text-[10px] font-mono text-red-400 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {/* Anchor mosaic preview */}
          {activeSoul.anchors.length > 0 && (
            <div className="mt-3">
              <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">
                Top anchors
              </div>
              <div className="grid grid-cols-5 gap-1">
                {topAnchors(activeSoul, 10).map((a, i) => (
                  <div key={i} className="relative aspect-square bg-black/40 border border-white/10 rounded overflow-hidden group">
                    <img src={a.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[7px] font-mono text-violet-200 bg-black/80 opacity-0 group-hover:opacity-100">
                      {(a.matchScore * 100).toFixed(0)}%{a.taggedAsHero && '★'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================

const SoulRow: React.FC<{ soul: SoulCast; active: boolean; onActivate: () => void; onDelete: () => void }> = ({ soul, active, onActivate, onDelete }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg border ${active ? 'bg-violet-500/15 border-violet-400/50' : 'bg-black/40 border-white/5 hover:border-violet-500/30'}`}>
    <button onClick={onActivate} className="flex-1 text-left flex items-center gap-2">
      {active ? <CheckCircle2 className="w-3 h-3 text-violet-300" /> : <div className="w-3 h-3 rounded-full border border-gray-600" />}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-white truncate">{soul.name}</div>
        <div className="text-[9px] font-mono text-gray-500 truncate">
          {soul.archetype} · {soul.anchors.length} anchors · v{soul.version}
        </div>
      </div>
      {soul.fidelityScore > 0.5 && <Star className="w-3 h-3 text-amber-400" />}
    </button>
    <button onClick={onDelete} className="text-gray-600 hover:text-red-400">
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
);

// =============================================================================

const SoulAction: React.FC<{ icon: React.ReactNode; label: string; hint: string; busy?: boolean; onClick: () => void; variant?: 'default' | 'primary' }> = ({ icon, label, hint, busy, onClick, variant }) => (
  <button
    onClick={onClick}
    disabled={busy}
    title={hint}
    className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border text-[9px] font-mono uppercase tracking-wider transition disabled:opacity-40 ${
      variant === 'primary'
        ? 'bg-fuchsia-600/30 border-fuchsia-400/50 text-fuchsia-200 hover:bg-fuchsia-600/50'
        : 'bg-black/40 border-white/10 text-gray-300 hover:border-violet-500/40'
    }`}
  >
    {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : icon}
    <span className="text-center leading-tight">{label}</span>
  </button>
);

// =============================================================================

const CreateSoulForm: React.FC<{ onDone: () => void; onCancel: () => void; setBusy: (b: 'create' | undefined) => void; setError: (e: string | null) => void; setProgress: (s: string) => void }> = ({ onDone, onCancel, setBusy, setError, setProgress }) => {
  const [name, setName] = useState('Dico Sovereign');
  const [archetype, setArchetype] = useState('Sovereign Hero');
  const [seedUrls, setSeedUrls] = useState<string[]>(['']);
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const addSeedRow = () => setSeedUrls(s => [...s, '']);
  const updateSeed = (i: number, v: string) => setSeedUrls(s => s.map((x, j) => j === i ? v : x));
  const removeSeed = (i: number) => setSeedUrls(s => s.filter((_, j) => j !== i));

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles(f => [...f, ...list]);
  };

  const filesToDataUrls = async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    })));
  };

  const onCreate = async () => {
    setBusy('create'); setError(null); setCreating(true);
    try {
      setProgress('Reading seed photos…');
      const fileDataUrls = await filesToDataUrls(files);
      const seedPhotoUrls = [
        ...seedUrls.filter(u => u.trim()),
        ...fileDataUrls,
      ];
      if (seedPhotoUrls.length === 0) {
        throw new Error('Need at least one seed photo (URL or file).');
      }
      console.log('[SoulCast] Creating soul with', seedPhotoUrls.length, 'seed photos');
      setProgress(`Loading face-api models + computing descriptors for ${seedPhotoUrls.length} seed photo(s)…`);
      const created = await createSoul({
        name,
        archetype,
        seedPhotoUrls,
      });
      console.log('[SoulCast] Soul created:', created.id, 'with', created.seedDescriptors.length, 'face descriptors');
      setProgress(`✓ Soul created (${created.seedDescriptors.length} faces detected, variance ${created.variance.toFixed(3)})`);
      onDone();
    } catch (err) {
      console.error('[SoulCast] Create failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(undefined); setCreating(false);
    }
  };

  return (
    <div className="bg-black/60 border border-violet-500/40 rounded-xl p-3 mb-3 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-violet-300">Create Soul</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Dico Sovereign)"
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-white" />
      <input value={archetype} onChange={e => setArchetype(e.target.value)} placeholder="Archetype"
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-white" />
      <div className="space-y-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Seed photos (URLs)</div>
        {seedUrls.map((u, i) => (
          <div key={i} className="flex items-center gap-1">
            <input value={u} onChange={e => updateSeed(i, e.target.value)} placeholder="data:... or https URL or /anchor-library/path.png"
              className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white" />
            <button onClick={() => removeSeed(i)} className="text-gray-500 hover:text-red-400 text-xs">×</button>
          </div>
        ))}
        <button onClick={addSeedRow} className="text-[9px] font-mono uppercase text-cyan-400 hover:text-cyan-300">+ add URL</button>
      </div>
      <div className="space-y-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Or upload files</div>
        <input type="file" multiple accept="image/*" onChange={onFilePick}
          className="text-[9px] font-mono text-gray-400" />
        {files.length > 0 && <div className="text-[9px] font-mono text-cyan-300">{files.length} file(s) selected</div>}
      </div>
      <div className="flex gap-2">
        <button onClick={onCreate} disabled={creating}
          className="flex-1 py-1.5 bg-violet-600/30 border border-violet-400/50 hover:bg-violet-600/50 rounded-lg text-[10px] font-mono uppercase tracking-widest text-violet-200 disabled:opacity-50 flex items-center justify-center gap-2">
          {creating && <RefreshCw className="w-3 h-3 animate-spin" />}
          {creating ? 'Computing descriptors…' : 'Create'}
        </button>
        <button onClick={onCancel} disabled={creating}
          className="px-4 py-1.5 bg-black/50 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-mono uppercase tracking-widest text-gray-400 disabled:opacity-30">
          Cancel
        </button>
      </div>
    </div>
  );
};
