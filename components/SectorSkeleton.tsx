import React from 'react';

const SectorSkeleton: React.FC = () => (
    <div className="h-full w-full flex flex-col bg-[var(--bg-app)] animate-pulse">
        {/* Header skeleton */}
        <div className="h-14 flex items-center gap-4 px-6 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-white/5" />
            <div className="w-40 h-4 rounded bg-white/5" />
            <div className="flex-1" />
            <div className="w-24 h-4 rounded bg-white/5" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-6">
            {/* Title area */}
            <div className="space-y-3">
                <div className="w-64 h-6 rounded bg-white/5" />
                <div className="w-96 h-3 rounded bg-white/[0.03]" />
            </div>
            {/* Card grid skeleton */}
            <div className="grid grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-40 rounded-2xl bg-white/[0.02] border border-white/5" />
                ))}
            </div>
            {/* Bottom section */}
            <div className="flex gap-4">
                <div className="flex-1 h-60 rounded-2xl bg-white/[0.02] border border-white/5" />
                <div className="w-80 h-60 rounded-2xl bg-white/[0.02] border border-white/5" />
            </div>
        </div>
    </div>
);

export default SectorSkeleton;
