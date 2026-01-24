/**
 * REFERENCE MANAGER
 * Handles upload, display, and removal of reference images for ImageGen.
 * Categories: Character (CHAR), World/Set (SET), Style (STYLE)
 */
import React from 'react';
import { Plus, X, UserCircle, Map as MapIcon, Palette } from 'lucide-react';
import { FileData } from '../../../../types';
import { fileToGenerativePart } from '../../../../services/geminiService';
import { audio } from '../../../../services/audioService';

interface ReferenceManagerProps {
    characterRefs: FileData[];
    worldRefs: FileData[];
    styleRefs: FileData[];
    onRefsChange: (type: 'CHAR' | 'SET' | 'STYLE', refs: FileData[]) => void;
    onLog: (level: 'INFO' | 'ERROR', message: string) => void;
}

const ReferenceManager: React.FC<ReferenceManagerProps> = ({
    characterRefs,
    worldRefs,
    styleRefs,
    onRefsChange,
    onLog
}) => {
    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const dataPromises = files.map(file => fileToGenerativePart(file));
            const newDatas = await Promise.all(dataPromises);

            const currentRefs = type === 'CHAR' ? characterRefs : type === 'SET' ? worldRefs : styleRefs;
            onRefsChange(type, [...currentRefs, ...newDatas]);

            audio.playClick();
            onLog('INFO', `ASSET_LOAD: Added ${newDatas.length} references to ${type} buffer.`);
        }
    };

    const removeRef = (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => {
        const currentRefs = type === 'CHAR' ? characterRefs : type === 'SET' ? worldRefs : styleRefs;
        onRefsChange(type, currentRefs.filter((_, i) => i !== idx));
    };

    const renderRefSection = (type: 'CHAR' | 'SET' | 'STYLE') => {
        const refs = type === 'CHAR' ? characterRefs : type === 'SET' ? worldRefs : styleRefs;
        const Icon = type === 'CHAR' ? UserCircle : type === 'SET' ? MapIcon : Palette;
        const label = type === 'CHAR' ? 'Identity' : type === 'SET' ? 'World' : 'Aesthetic';

        return (
            <div className="space-y-3 shrink-0">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon size={12} /> {label} Vector
                    </span>
                    <label className="p-1 cursor-pointer hover:text-white text-gray-600 transition-colors">
                        <Plus size={14} />
                        <input type="file" multiple className="hidden" onChange={(e) => handleRefUpload(e, type)} />
                    </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {refs.map((ref, i) => (
                        <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-white/5 group/ref">
                            <img
                                src={`data:${ref.inlineData.mimeType};base64,${ref.inlineData.data}`}
                                className="w-full h-full object-cover grayscale-[30%] group-hover/ref:grayscale-0 transition-all"
                                alt="ref"
                            />
                            <button
                                onClick={() => removeRef(i, type)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white opacity-0 group-hover/ref:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <label className="aspect-square rounded-lg border border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--amethyst)]/40 group/add">
                        <Plus size={16} className="text-gray-700 group-hover/add:text-[var(--amethyst)] transition-colors" />
                        <input type="file" multiple className="hidden" onChange={(e) => handleRefUpload(e, type)} />
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {renderRefSection('CHAR')}
            {renderRefSection('SET')}
            {renderRefSection('STYLE')}
        </div>
    );
};

export default ReferenceManager;
