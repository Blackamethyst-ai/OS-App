// Cinema Studio — substrate-first UI shell.
//
// Seedance 2.0 is the ground floor. Other models surface only when the
// router decides a constraint forces an escape. The composer mirrors
// Seedance's reference grammar: up to 9 image refs, 3 video refs, 3 audio
// refs, addressed in the prompt as [Image1]..[Audio3].

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Film, Layers, Sparkles, AlertCircle, Image as ImgIcon, Mic, Video,
} from 'lucide-react';
import {
  route,
  renderShot, renderSegmentedShot,
  listRecent,
  totalSpendUsd,
  listModels,
  isSubstrate,
  SUBSTRATE_MODEL_ID,
  SCENE_PRESETS,
  uploadRefImage,
  CAMERA_MOVES,
  FRAMING_PRESETS,
  STYLE_SIGNATURES,
  composeShotPrompt,
  explainCompose,
} from '../../services/cinema';
import { AnchorLibrary } from './AnchorLibrary';
import { SoulCastPanel } from './SoulCastPanel';
import { Section } from './parts/Section';
import { Header } from './parts/Header';
import { QueuePanel } from './parts/QueuePanel';
import { PreviewPanel } from './parts/PreviewPanel';
import { CharacterSheetSection } from './parts/CharacterSheetSection';
import type { RefRow } from './parts/types';
import type { SoulCast } from '../../services/cinema';
import type {
  RenderRequest,
  RenderEvent,
  ImageRef,
  VideoRef,
  AudioRef,
  ProviderCredentials,
  Resolution,
  AspectRatio,
  ManifestEntry,
  ScenePreset,
} from '../../services/cinema';
import { apiKeyService } from '../../services/apiKeyService';

// =============================================================================

const RESOLUTIONS: Resolution[] = ['480p', '720p', '1080p'];
const ASPECTS: AspectRatio[] = ['16:9', '9:16', '1:1', '21:9'];

function loadCreds(): ProviderCredentials {
  // apiKeyService.getKey() reads from encrypted vault first, env var fallback.
  //
  // Each var is read as its own `import.meta.env.X` expression on purpose.
  // Vite only static-replaces that exact form; binding the whole object
  // (`const env = import.meta.env`) makes it serialise the ENTIRE env into
  // the chunk instead. That is not theoretical — it shipped every VITE_ var
  // in .env.local into dist/assets/ImageGen-*.js, including a live DeepSeek
  // key and VITE_FAL_API_KEY that no code here even references, silently
  // undoing the BYO-key-only lockdown. Never destructure or alias
  // import.meta.env.
  return {
    fal: apiKeyService.getKey('fal'),
    openai: apiKeyService.getKey('openai'),
    runway: apiKeyService.getKey('runway'),
    vertexProject: import.meta.env.VITE_VERTEX_PROJECT,
    vertexLocation: import.meta.env.VITE_VERTEX_LOCATION,
    vertexAccessToken: import.meta.env.VITE_VERTEX_ACCESS_TOKEN,
    replicate: import.meta.env.VITE_REPLICATE_API_KEY,
  };
}

// =============================================================================

export const CinemaStudio: React.FC = () => {
  // Composer state
  const [prompt, setPrompt] = useState(
    '[Image1] in golden hour light, slowly turning toward camera with a knowing half-smile. Cinematic dolly-in, shallow depth of field, warm rim from 4 oclock. Native ambient room tone audio.',
  );
  const [refImages, setRefImages] = useState<RefRow[]>([{ url: '' }]);
  const [refVideos, setRefVideos] = useState<RefRow[]>([]);
  const [refAudio, setRefAudio] = useState<RefRow[]>([]);
  const [duration, setDuration] = useState(6);
  const [aspect, setAspect] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [audioOn, setAudioOn] = useState(true);
  const [budgetTier, setBudgetTier] =
    useState<RenderRequest['budgetTier']>('mid');
  const [pinnedModel, setPinnedModel] = useState<string | undefined>(undefined);
  const [cameraMoveId, setCameraMoveId] = useState<string | undefined>(undefined);
  const [framingId, setFramingId] = useState<string | undefined>(undefined);
  const [styleId, setStyleId] = useState<string | undefined>(undefined);
  const [activeSoul, setActiveSoul] = useState<SoulCast | undefined>(undefined);

  // Runtime state
  const [events, setEvents] = useState<RenderEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ManifestEntry[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);

  // Compose final prompt = base + framing + camera + style + Soul identity lock
  const composedPrompt = useMemo(() => {
    const base = composeShotPrompt({
      basePrompt: prompt,
      cameraMoveId,
      framingId,
      styleId,
    });
    if (!activeSoul) return base;
    // Inject Soul identity lock at the END so it dominates the prompt's tail
    return [
      base,
      '',
      '— IDENTITY LOCK —',
      activeSoul.faceAnchorPrompt,
      '',
      activeSoul.productionBible,
      activeSoul.signatureOutfit ? `Default wardrobe unless overridden: ${activeSoul.signatureOutfit}` : '',
    ].filter(Boolean).join('\n');
  }, [prompt, cameraMoveId, framingId, styleId, activeSoul]);

  // Build a draft request to preview the routing decision live
  const draftReq: RenderRequest = useMemo(() => ({
    prompt: composedPrompt,
    modality: refImages.some(r => r.url) ? 'r2v' : 't2v',
    refImages: refImages.filter(r => r.url).map(r => ({
      url: r.url,
      alias: r.alias,
      source: r.source,
      isPersonLikeness: r.isPersonLikeness,
    })),
    refVideos: refVideos.filter(r => r.url).map(r => ({ url: r.url, alias: r.alias })),
    refAudio: refAudio.filter(r => r.url).map(r => ({ url: r.url, alias: r.alias })),
    durationSec: duration,
    aspectRatio: aspect,
    resolution,
    generateAudio: audioOn,
    budgetTier,
    preferredModelId: pinnedModel,
  }), [composedPrompt, refImages, refVideos, refAudio, duration, aspect, resolution, audioOn, budgetTier, pinnedModel]);

  const decision = useMemo(() => {
    try { return route(draftReq); } catch { return null; }
  }, [draftReq]);

  const refreshHistory = useCallback(async () => {
    try {
      const recent = await listRecent(20);
      setHistory(recent);
      setTotalSpend(await totalSpendUsd());
    } catch { /* IDB not available in some envs */ }
  }, []);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  // Pre-flight: catch missing prompt / refs / keys BEFORE we fire a paid render.
  // Returns null if OK, otherwise a string explaining why we stopped.
  const validateBeforeRender = (): string | null => {
    if (!draftReq.prompt?.trim()) return 'Prompt is empty.';
    if (!decision) return 'No routing decision — check refs and budget.';
    const provider = decision.primary.provider;
    const creds = loadCreds();
    if (provider === 'fal' && !creds.fal) return 'fal API key missing — paste it in Settings.';
    if (provider === 'openai' && !creds.openai) return 'OpenAI API key missing.';
    if (provider === 'runway' && !creds.runway) return 'Runway API key missing.';
    if (provider === 'vertex' && !creds.vertexAccessToken) return 'Vertex access token missing.';
    if (decision.primary.capabilities.maxRefImages > 0 && (refImages.filter(r => r.url).length === 0) && draftReq.modality !== 't2v') {
      return `Selected model expects ≥1 ref image — modality is ${draftReq.modality}.`;
    }
    return null;
  };

  const onGenerate = async () => {
    const fail = validateBeforeRender();
    if (fail) { setError(fail); return; }
    const estCost = decision?.estimatedCostUsd ?? 0;
    const confirmed = window.confirm(
      `Render on ${decision?.primary.label}.\nEstimated cost: $${estCost.toFixed(2)}.\nProceed?`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    setEvents([]);
    setOutputUrl(null);
    try {
      const out = await renderShot(draftReq, {
        creds: loadCreds(),
        onProgress: ev => setEvents(prev => [...prev, ev]),
      });
      setOutputUrl(out.result.videoUrl);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onGenerateSegmented = async () => {
    const fail = validateBeforeRender();
    if (fail) { setError(fail); return; }
    // Confirm cost — segmented runs N parallel paid renders.
    const segCount = Math.ceil(duration / 3);
    const estCost = (decision?.estimatedCostUsd ?? 0) * segCount;
    const confirmed = window.confirm(
      `Segmented render: ${segCount} × 3s parallel renders on ${decision?.primary.label}.\nEstimated total: $${estCost.toFixed(2)}.\nProceed?`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    setEvents([]);
    setOutputUrl(null);
    try {
      const out = await renderSegmentedShot(draftReq, {
        creds: loadCreds(),
        onProgress: ev => setEvents(prev => [...prev, ev]),
        segmentSec: 3,
        totalSec: duration,
        parallel: true,
      });
      const last = out.segments[out.segments.length - 1]?.result.videoUrl;
      if (last) setOutputUrl(last);
      try { await navigator.clipboard?.writeText(out.concatList); } catch { /* */ }
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // ===========================================================================

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      <Header
        decisionLabel={decision?.primary.label ?? '—'}
        substrateLabel={
          decision?.primary.capabilityTags?.includes('accepts-real-likeness')
            ? `${decision.primary.family.charAt(0).toUpperCase() + decision.primary.family.slice(1)} face-lock substrate`
            : 'Seedance 2.0 Substrate'
        }
        totalSpend={totalSpend}
        activeSoul={activeSoul}
      />
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        <ComposerPanel
          prompt={prompt}
          setPrompt={setPrompt}
          refImages={refImages} setRefImages={setRefImages}
          refVideos={refVideos} setRefVideos={setRefVideos}
          refAudio={refAudio} setRefAudio={setRefAudio}
          duration={duration} setDuration={setDuration}
          aspect={aspect} setAspect={setAspect}
          resolution={resolution} setResolution={setResolution}
          audioOn={audioOn} setAudioOn={setAudioOn}
          budgetTier={budgetTier} setBudgetTier={setBudgetTier}
          pinnedModel={pinnedModel} setPinnedModel={setPinnedModel}
          cameraMoveId={cameraMoveId} setCameraMoveId={setCameraMoveId}
          framingId={framingId} setFramingId={setFramingId}
          styleId={styleId} setStyleId={setStyleId}
          activeSoul={activeSoul}
          setActiveSoul={setActiveSoul}
        />
        <PreviewPanel
          decision={decision}
          busy={busy}
          events={events}
          outputUrl={outputUrl}
          error={error}
          onGenerate={onGenerate}
          onGenerateSegmented={onGenerateSegmented}
          duration={duration}
        />
        <QueuePanel history={history} />
      </div>
    </div>
  );
};

// =============================================================================

interface ComposerProps {
  prompt: string; setPrompt: (s: string) => void;
  refImages: RefRow[]; setRefImages: React.Dispatch<React.SetStateAction<RefRow[]>>;
  refVideos: RefRow[]; setRefVideos: React.Dispatch<React.SetStateAction<RefRow[]>>;
  refAudio: RefRow[]; setRefAudio: React.Dispatch<React.SetStateAction<RefRow[]>>;
  duration: number; setDuration: (n: number) => void;
  aspect: AspectRatio; setAspect: (a: AspectRatio) => void;
  resolution: Resolution; setResolution: (r: Resolution) => void;
  audioOn: boolean; setAudioOn: (b: boolean) => void;
  budgetTier: RenderRequest['budgetTier']; setBudgetTier: (b: RenderRequest['budgetTier']) => void;
  pinnedModel: string | undefined; setPinnedModel: (id: string | undefined) => void;
  cameraMoveId: string | undefined; setCameraMoveId: (id: string | undefined) => void;
  framingId: string | undefined; setFramingId: (id: string | undefined) => void;
  styleId: string | undefined; setStyleId: (id: string | undefined) => void;
  activeSoul: SoulCast | undefined;
  setActiveSoul: (s: SoulCast | undefined) => void;
}

const ComposerPanel: React.FC<ComposerProps> = (p) => (
  <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
    <SoulCastPanel
      onApplyAnchors={anchors => {
        p.setRefImages(() => {
          const rows: RefRow[] = anchors.map(a => ({
            url: a.url,
            alias: a.alias,
            source: a.source,
            isPersonLikeness: a.isPersonLikeness,
          }));
          while (rows.length < 9) rows.push({ url: '', alias: undefined });
          return rows.slice(0, 9);
        });
      }}
      onSoulActivated={p.setActiveSoul}
    />

    <CharacterSheetSection refImages={p.refImages} setRefImages={p.setRefImages} />

    <AnchorLibrary
      onPick={url => {
        p.setRefImages(rs => {
          // Drop into first empty slot, or append if all filled
          const idx = rs.findIndex(r => !r.url);
          if (idx >= 0) return rs.map((r, i) => i === idx ? { url, alias: 'anchor' } : r);
          if (rs.length < 9) return [...rs, { url, alias: 'anchor' }];
          return rs;
        });
      }}
      occupiedSlots={p.refImages.filter(r => r.url).length}
      maxSlots={9}
    />

    <Section title="Scene presets" icon={<Sparkles className="w-4 h-4 text-amber-400" />}>
      <div className="grid grid-cols-2 gap-1.5">
        {SCENE_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => {
              p.setPrompt(preset.prompt);
              // Hint user with shape; refs still need real URLs.
              const slotCount = preset.suggestedRefs.images?.length ?? 0;
              p.setRefImages(Array.from({ length: Math.max(1, slotCount) }, () => ({ url: '' })));
              if (preset.suggestedRefs.videos) {
                p.setRefVideos(preset.suggestedRefs.videos.map(() => ({ url: '' })));
              } else {
                p.setRefVideos([]);
              }
              if (preset.suggestedRefs.audio) {
                p.setRefAudio(preset.suggestedRefs.audio.map(() => ({ url: '' })));
              } else {
                p.setRefAudio([]);
              }
              p.setDuration(preset.durationSec);
              p.setAspect(preset.aspectRatio);
              p.setResolution(preset.resolution);
              p.setAudioOn(preset.generateAudio);
            }}
            className="text-left p-2 bg-black/40 border border-white/10 rounded-xl hover:border-amber-500/40 transition group"
            title={preset.description}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 group-hover:text-amber-200 truncate">{preset.label}</div>
            <div className="text-[9px] text-gray-500 truncate">{preset.category}</div>
          </button>
        ))}
      </div>
    </Section>

    <Section title="Prompt" icon={<Layers className="w-4 h-4 text-fuchsia-400" />}>
      <textarea
        className="w-full h-40 bg-black/50 border border-white/10 rounded-2xl p-4 text-sm font-mono outline-none focus:border-fuchsia-500/50 resize-none"
        value={p.prompt}
        onChange={e => p.setPrompt(e.target.value)}
        placeholder="Reference [Image1]..[Image9], [Video1]..[Video3], [Audio1]..[Audio3] in your prompt body."
      />
      <p className="text-[10px] text-gray-500 mt-2 font-mono">
        Tip: name the slots — &quot;[Image1] enters frame as [Image2] cycles through scene&quot;.
      </p>
    </Section>

    <RefList label="Image refs (max 9)" icon={<ImgIcon className="w-4 h-4 text-cyan-400" />} rows={p.refImages} setRows={p.setRefImages} max={9} placeholder="paste URL or click ↑ to upload" allowUpload />
    <RefList label="Video refs (max 3)" icon={<Video className="w-4 h-4 text-emerald-400" />} rows={p.refVideos} setRows={p.setRefVideos} max={3} placeholder="motion ref URL" />
    <RefList label="Audio refs (max 3)" icon={<Mic className="w-4 h-4 text-amber-400" />} rows={p.refAudio} setRows={p.setRefAudio} max={3} placeholder="voice/ambient audio URL" />

    <Section title="Output" icon={<Film className="w-4 h-4 text-cyan-400" />}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          Duration (s)
          <input type="number" min={1} max={25} value={p.duration} onChange={e => p.setDuration(Number(e.target.value))}
            className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          Aspect
          <select value={p.aspect} onChange={e => p.setAspect(e.target.value as AspectRatio)}
            className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {ASPECTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          Resolution
          <select value={p.resolution} onChange={e => p.setResolution(e.target.value as Resolution)}
            className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          Budget tier
          <select value={p.budgetTier} onChange={e => p.setBudgetTier(e.target.value as RenderRequest['budgetTier'])}
            className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {(['ultra-low','low','mid','high','unlimited'] as const).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 mt-4 text-xs font-mono text-gray-300">
        <input type="checkbox" checked={p.audioOn} onChange={e => p.setAudioOn(e.target.checked)} />
        Native audio (Seedance lip-sync + ambience)
      </label>
    </Section>

    <Section title="Preset packs" icon={<Layers className="w-4 h-4 text-violet-400" />}>
      <div className="space-y-2 text-[10px] font-mono">
        <PresetSelect
          label="Framing"
          value={p.framingId}
          onChange={p.setFramingId}
          groups={groupBy(FRAMING_PRESETS, f => f.group)}
        />
        <PresetSelect
          label="Camera move"
          value={p.cameraMoveId}
          onChange={p.setCameraMoveId}
          groups={groupBy(CAMERA_MOVES, c => c.group)}
        />
        <PresetSelect
          label="Style signature"
          value={p.styleId}
          onChange={p.setStyleId}
          groups={groupBy(STYLE_SIGNATURES, s => s.group)}
        />
        <p className="text-[9px] text-gray-600 leading-relaxed mt-2">
          Composes onto your prompt under "Framing:", "Camera:", "Style:" before render.
          Craft new packs by editing <code className="text-cyan-400">services/cinema/presetPacks/</code>.
        </p>
      </div>
    </Section>

    <Section title="Model pin (optional)" icon={<AlertCircle className="w-4 h-4 text-amber-400" />}>
      <select value={p.pinnedModel ?? ''} onChange={e => p.setPinnedModel(e.target.value || undefined)}
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white">
        <option value="">— Auto (substrate-first router) —</option>
        {listModels().map(m => (
          <option key={m.id} value={m.id}>
            {isSubstrate(m.id) ? '★ ' : ''}
            {m.label} · ${m.pricing.per720pSec?.toFixed(3) ?? '—'}/s
          </option>
        ))}
      </select>
      <p className="text-[10px] text-gray-500 mt-2 font-mono">
        Default: <code className="text-cyan-300">{SUBSTRATE_MODEL_ID}</code>. Pin a model to override the router.
      </p>
    </Section>
  </div>
);

// =============================================================================

const RefList: React.FC<{ label: string; icon: React.ReactNode; rows: RefRow[]; setRows: React.Dispatch<React.SetStateAction<RefRow[]>>; max: number; placeholder: string; allowUpload?: boolean }> = ({ label, icon, rows, setRows, max, placeholder, allowUpload }) => {
  const [uploadingIdx, setUploadingIdx] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    setUploadError(null);
    try {
      const falKey = apiKeyService.getKey('fal');
      if (!falKey) {
        throw new Error('fal API key required — drop VITE_FAL_API_KEY in .env.local first');
      }
      const url = await uploadRefImage(file, falKey);
      setRows(rs => rs.map((r, j) => j === idx ? { ...r, url } : r));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <Section title={label} icon={icon}>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-300 w-14 shrink-0">[{label.split(' ')[0]}{i + 1}]</span>
            <input
              type="text"
              value={row.url}
              onChange={e => setRows(rs => rs.map((r, j) => j === i ? { ...r, url: e.target.value } : r))}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500/50"
              placeholder={placeholder}
            />
            {row.url && row.source && (
              <span
                title={
                  row.source === 'real_photo'
                    ? 'Real photo — Seedance partner_validation will reject'
                    : row.source === 'ai_generated'
                      ? 'AI-generated — accepted by Seedance and Kling'
                      : 'Composite ref — manual override may be required'
                }
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                  row.source === 'real_photo' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                  : row.source === 'ai_generated' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-gray-400 border-white/10 bg-white/5'
                }`}
              >
                {row.source === 'real_photo' ? 'photo' : row.source === 'ai_generated' ? 'ai' : 'mix'}
              </span>
            )}
            {allowUpload && (
              <label className={`text-[10px] font-mono uppercase tracking-widest cursor-pointer ${uploadingIdx === i ? 'text-amber-400' : 'text-emerald-400 hover:text-emerald-300'}`}
                title="Upload to fal.media storage">
                {uploadingIdx === i ? '…' : '↑'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(i, e.target.files[0])}
                  disabled={uploadingIdx !== null}
                />
              </label>
            )}
            <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}
              className="text-gray-500 hover:text-red-400 text-xs font-mono">×</button>
          </div>
        ))}
        {rows.length < max && (
          <button
            onClick={() => setRows(rs => [...rs, { url: '' }])}
            className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
          >+ add ({rows.length}/{max})</button>
        )}
        {uploadError && <div className="text-[10px] text-red-400 font-mono mt-2">{uploadError}</div>}
      </div>
    </Section>
  );
};

// =============================================================================


// =============================================================================


// =============================================================================

// =============================================================================
// Generic preset selector with optgroup grouping

interface PresetItem { id: string; label: string }

function groupBy<T extends PresetItem>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

const PresetSelect: React.FC<{
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  groups: Record<string, PresetItem[]>;
}> = ({ label, value, onChange, groups }) => (
  <label className="block">
    <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-violet-500/50"
    >
      <option value="">— None —</option>
      {Object.entries(groups).map(([groupName, items]) => (
        <optgroup key={groupName} label={groupName.toUpperCase()}>
          {items.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  </label>
);

export default CinemaStudio;
