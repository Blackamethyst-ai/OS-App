import React, { useState } from 'react';
import { ListVideo, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ManifestEntry } from '../../../services/cinema';
import { Section } from './Section';

export const QueuePanel: React.FC<{ history: ManifestEntry[] }> = ({ history }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
      <Section title="Render queue" icon={<ListVideo className="w-4 h-4 text-emerald-400" />}>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {history.length === 0 && (
            <div className="text-[10px] font-mono text-gray-600">No renders yet.</div>
          )}
          {history.map(entry => {
            const videoUrl = entry.finalResult?.videoUrl;
            const isOpen = openId === entry.id;
            return (
              <div key={entry.id} className="bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-mono">
                <div className="flex items-center gap-2 mb-1">
                  {entry.status === 'succeeded' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {entry.status === 'fallback-succeeded' && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                  {entry.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                  {entry.status === 'pending' && <span className="w-3 h-3 inline-block rounded-full bg-gray-500/40" />}
                  <span className="text-cyan-300 truncate flex-1">{entry.shotName ?? entry.decision.primary.id}</span>
                  <span className="text-gray-500">${entry.totalCostUsd.toFixed(3)}</span>
                </div>
                <div className="text-gray-500 truncate">{entry.request.prompt}</div>
                {entry.attempts.length > 1 && (
                  <div className="text-amber-500/70 text-[9px] mt-1">{entry.attempts.length} attempts</div>
                )}
                {videoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setOpenId(isOpen ? null : entry.id)}
                      className="text-cyan-300 hover:text-cyan-200 text-[9px] uppercase tracking-widest"
                    >
                      {isOpen ? '▼ hide' : '▶ play'}
                    </button>
                    <a
                      href={videoUrl}
                      download={`${entry.shotName ?? entry.decision.primary.id}.mp4`}
                      className="text-emerald-300 hover:text-emerald-200 text-[9px] uppercase tracking-widest"
                    >
                      ↓ download
                    </a>
                  </div>
                )}
                {isOpen && videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full mt-2 rounded-lg border border-white/10"
                    style={{ maxHeight: 220 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
};
