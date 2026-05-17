// Cinema Studio — Anchor Library picker.
// Reads /anchor-library-index.json (built by scripts/build-anchor-index.sh) and
// presents a thumbnail grid. Click a thumbnail → onPick(url) drops it into
// the next empty [Image1..9] slot in the composer.

import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Library } from 'lucide-react';

interface AnchorEntry {
  name: string;
  url: string;
  mtime: number;
  size: number;
}

interface AnchorLibraryProps {
  onPick: (url: string) => void;
  occupiedSlots: number;
  maxSlots: number;
}

const INDEX_URL = '/anchor-library-index.json';

export const AnchorLibrary: React.FC<AnchorLibraryProps> = ({ onPick, occupiedSlots, maxSlots }) => {
  const [entries, setEntries] = useState<AnchorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'name'>('recent');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${INDEX_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AnchorEntry[];
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let out = entries;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(e => e.name.toLowerCase().includes(q));
    }
    out = [...out].sort((a, b) =>
      sortMode === 'recent' ? b.mtime - a.mtime : a.name.localeCompare(b.name),
    );
    return out;
  }, [entries, search, sortMode]);

  const remaining = maxSlots - occupiedSlots;

  return (
    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Library className="w-4 h-4 text-violet-400" />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400 flex-1">
          Anchor Library
        </h3>
        <span className="text-[10px] font-mono text-gray-500">{filtered.length}/{entries.length}</span>
        <button onClick={load} className="text-gray-500 hover:text-violet-400" title="Reload index">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="filter by name…"
            className="w-full pl-7 pr-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-[10px] font-mono text-white outline-none focus:border-violet-500/50"
          />
        </div>
        <select value={sortMode} onChange={e => setSortMode(e.target.value as 'recent' | 'name')}
          className="bg-black/50 border border-white/10 rounded-lg px-2 text-[10px] font-mono text-gray-300">
          <option value="recent">Recent</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading && <div className="text-[10px] text-gray-500 font-mono">Loading…</div>}
      {error && (
        <div className="text-[10px] text-amber-400 font-mono">
          No index. Run <code>scripts/build-anchor-index.sh</code> to populate.
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <div className="text-[10px] text-gray-500 font-mono">
          Empty. Drop refs in <code>public/anchor-library/</code> and rebuild index.
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto custom-scrollbar">
        {filtered.slice(0, 60).map(entry => (
          <button
            key={entry.url}
            onClick={() => remaining > 0 && onPick(entry.url)}
            disabled={remaining === 0}
            className="relative group aspect-square bg-black/40 border border-white/5 rounded-lg overflow-hidden hover:border-violet-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
            title={entry.name}
          >
            <img
              src={entry.url}
              alt={entry.name}
              loading="lazy"
              className="w-full h-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1 opacity-0 group-hover:opacity-100 transition">
              <div className="text-[8px] font-mono text-violet-200 truncate">{entry.name}</div>
            </div>
          </button>
        ))}
      </div>

      {remaining === 0 && (
        <div className="mt-2 text-[10px] text-amber-400 font-mono">
          All {maxSlots} slots full. Remove a ref to add another.
        </div>
      )}
      {filtered.length > 60 && (
        <div className="mt-2 text-[10px] text-gray-600 font-mono">
          Showing 60 of {filtered.length}. Filter to narrow.
        </div>
      )}
    </div>
  );
};
