import React from 'react';
import { motion } from 'motion/react';
import { Film, Sparkles, Play, AlertCircle } from 'lucide-react';
import type { RenderEvent } from '../../../services/cinema';
import type { route } from '../../../services/cinema';
import { Section } from './Section';

const BusyState: React.FC<{ events: RenderEvent[] }> = ({ events }) => (
  <div className="p-6 w-full max-w-md">
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.6 }}
      className="text-center text-cyan-300 text-xs font-mono uppercase tracking-[0.4em] mb-6"
    >
      Rendering
    </motion.div>
    <div className="space-y-1 text-[10px] font-mono text-gray-400 max-h-64 overflow-y-auto">
      {events.slice(-15).map((ev, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={ev.type === 'fallback' ? 'text-amber-400' : ev.type === 'failed' ? 'text-red-400' : 'text-cyan-500'}>●</span>
          <span className="text-gray-300">{ev.type}</span>
          {ev.modelId && <span className="text-gray-600">{ev.modelId}</span>}
          {ev.message && <span className="text-gray-500 truncate flex-1">{ev.message}</span>}
        </div>
      ))}
    </div>
  </div>
);

export const PreviewPanel: React.FC<{
  decision: ReturnType<typeof route> | null;
  busy: boolean;
  events: RenderEvent[];
  outputUrl: string | null;
  error: string | null;
  onGenerate: () => void;
  onGenerateSegmented?: () => void;
  duration: number;
}> = ({ decision, busy, events, outputUrl, error, onGenerate, onGenerateSegmented, duration }) => (
  <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
    <Section title="Routing decision" icon={<Sparkles className="w-4 h-4 text-fuchsia-400" />}>
      {decision ? (
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-cyan-300">▶ {decision.primary.label}</span>
            <span className="text-gray-500">~${decision.estimatedCostUsd.toFixed(3)}</span>
            {decision.primary.capabilityTags?.includes('accepts-real-likeness') && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-400/40 text-violet-300">
                face-lock
              </span>
            )}
            {decision.primary.capabilityTags?.includes('blocks-real-likeness') && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300">
                no-likeness
              </span>
            )}
          </div>
          <div className="text-gray-400 text-[11px]">{decision.rationale}</div>
          <div className="text-[10px] text-gray-600">
            fallbacks: {decision.fallbacks.map(f => f.id).join(' → ') || '(none)'}
          </div>
        </div>
      ) : <div className="text-xs text-gray-500">Configure prompt + refs.</div>}
    </Section>

    <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl flex items-center justify-center overflow-hidden relative">
      {outputUrl ? (
        <video src={outputUrl} controls autoPlay loop className="w-full h-full object-contain" />
      ) : busy ? (
        <BusyState events={events} />
      ) : error ? (
        <div className="p-6 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <div className="text-xs font-mono text-red-300 break-all">{error}</div>
        </div>
      ) : (
        <div className="text-center text-gray-600 text-xs font-mono uppercase tracking-widest">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Substrate ready
        </div>
      )}
    </div>

    <div className="flex gap-2">
      <button
        onClick={onGenerate}
        disabled={busy || !decision}
        className="flex-1 py-4 bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white rounded-2xl font-mono font-bold uppercase tracking-widest text-sm disabled:opacity-30 hover:brightness-125 transition flex items-center justify-center gap-3"
      >
        <Play className="w-4 h-4" />
        {busy ? 'Rendering on substrate…' : 'Generate'}
      </button>
      {onGenerateSegmented && duration > 3 && (
        <button
          onClick={onGenerateSegmented}
          disabled={busy || !decision}
          title={`Render ${Math.ceil(duration / 3)} parallel 3s segments — golden window strategy. Concat list copied to clipboard.`}
          className="px-4 py-4 bg-gradient-to-br from-amber-600/30 to-violet-600/30 border border-amber-400/30 text-amber-200 rounded-2xl font-mono font-bold uppercase tracking-widest text-[10px] disabled:opacity-30 hover:brightness-125 transition flex items-center justify-center gap-2"
        >
          {Math.ceil(duration / 3)}×3s
        </button>
      )}
    </div>
  </div>
);
