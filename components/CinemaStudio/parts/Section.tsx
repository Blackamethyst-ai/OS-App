import React from 'react';

export const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400">{title}</h3>
    </div>
    {children}
  </div>
);
