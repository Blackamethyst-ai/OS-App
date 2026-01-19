/**
 * CPB Test Component
 *
 * Interactive test interface for the Cognitive Precision Bridge.
 * Supports text and multimodal (image) inputs.
 */

import React, { useState, useRef } from 'react';
import {
    BrainCircuit,
    Play,
    Loader2,
    Upload,
    Image as ImageIcon,
    X,
    Zap,
    Users,
    GitMerge,
    Layers,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { cpbExecute, cpbExecutePath } from '../services/cognitivePrecisionBridge';
import type { CPBPath, CPBStatus, CPBResult } from '../services/cognitivePrecisionBridge/types';
import { CPBMonitorPanel, CPBStatusBadge } from './CPBMonitor';
import { useAppStore } from '../store';

const PATH_OPTIONS: { value: CPBPath; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'direct', label: 'Direct', icon: <Zap size={14} />, description: 'Fast single-pass' },
    { value: 'rlm', label: 'RLM', icon: <BrainCircuit size={14} />, description: 'Long context' },
    { value: 'ace', label: 'ACE', icon: <Users size={14} />, description: 'Multi-agent consensus' },
    { value: 'hybrid', label: 'Hybrid', icon: <GitMerge size={14} />, description: 'RLM + ACE' },
    { value: 'cascade', label: 'Cascade', icon: <Layers size={14} />, description: 'Full verification' },
];

const CPBTest: React.FC = () => {
    const { actions } = useAppStore();
    const { setCPBState, addLog } = actions;

    const [query, setQuery] = useState('');
    const [context, setContext] = useState('');
    const [selectedPath, setSelectedPath] = useState<CPBPath | 'auto'>('auto');
    const [isExecuting, setIsExecuting] = useState(false);
    const [status, setStatus] = useState<CPBStatus | null>(null);
    const [result, setResult] = useState<CPBResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Multimodal state
    const [images, setImages] = useState<{ file: File; preview: string; base64?: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages = await Promise.all(
            Array.from(files).map(async (file) => {
                const preview = URL.createObjectURL(file);
                const base64 = await fileToBase64(file);
                return { file, preview, base64 };
            })
        );

        setImages([...images, ...newImages]);
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const handleExecute = async () => {
        if (!query.trim()) return;

        setIsExecuting(true);
        setError(null);
        setResult(null);
        addLog('SYSTEM', `[CPB] Starting execution: "${query.slice(0, 50)}..."`);

        try {
            // Build context with images if present
            let fullContext = context;
            if (images.length > 0) {
                fullContext += '\n\n[MULTIMODAL INPUT: ' + images.length + ' image(s) attached]';
                // Note: Actual image processing would require Gemini Vision API
            }

            const onStatus = (s: CPBStatus) => {
                setStatus(s);
                setCPBState({
                    isActive: s.phase !== 'complete' && s.phase !== 'error',
                    phase: s.phase,
                    path: s.path,
                    progress: s.progress,
                    message: s.message
                });
            };

            let cpbResult: CPBResult;
            if (selectedPath === 'auto') {
                cpbResult = await cpbExecute(query, fullContext, onStatus);
            } else {
                cpbResult = await cpbExecutePath(selectedPath, query, fullContext, onStatus);
            }

            setResult(cpbResult);
            setCPBState({
                isActive: false,
                phase: 'complete',
                lastResult: {
                    output: cpbResult.output,
                    confidence: cpbResult.confidence,
                    dqScore: cpbResult.dqScore.score,
                    path: cpbResult.path,
                    executionTimeMs: cpbResult.executionTimeMs,
                    tokensUsed: cpbResult.tokensUsed,
                    verified: cpbResult.verified,
                    pathReasoning: cpbResult.pathReasoning
                }
            });
            addLog('SUCCESS', `[CPB] Complete: ${cpbResult.path} path, DQ: ${(cpbResult.dqScore.score * 100).toFixed(0)}%`);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            setCPBState({ isActive: false, phase: 'error', error: errorMsg });
            addLog('ERROR', `[CPB] Error: ${errorMsg}`);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                        <BrainCircuit size={24} className="text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Cognitive Precision Bridge</h1>
                        <p className="text-gray-400">Unified RLM + ACE + DQ orchestration</p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="space-y-4 p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                    {/* Query Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Query</label>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter your query..."
                            className="w-full h-24 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    {/* Context Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Context (optional)</label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Paste context, code, or documentation..."
                            className="w-full h-32 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            {context.length.toLocaleString()} characters
                            {context.length > 50000 && <span className="text-purple-400 ml-2">→ Will trigger RLM path</span>}
                        </div>
                    </div>

                    {/* Image Upload (Multimodal) */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Images (Multimodal)</label>
                        <div className="flex flex-wrap gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img
                                        src={img.preview}
                                        alt={`Upload ${idx + 1}`}
                                        className="w-20 h-20 object-cover rounded-lg border border-gray-700"
                                    />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500 flex items-center justify-center transition-colors"
                            >
                                <Upload size={20} className="text-gray-500" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Path Selection */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Execution Path</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedPath('auto')}
                                className={`px-3 py-2 rounded-lg border transition-all ${
                                    selectedPath === 'auto'
                                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                }`}
                            >
                                <span className="text-sm">Auto-Route</span>
                            </button>
                            {PATH_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSelectedPath(opt.value)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                        selectedPath === opt.value
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                                    title={opt.description}
                                >
                                    {opt.icon}
                                    <span className="text-sm">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Execute Button */}
                    <button
                        onClick={handleExecute}
                        disabled={isExecuting || !query.trim()}
                        className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isExecuting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Executing...</span>
                            </>
                        ) : (
                            <>
                                <Play size={18} />
                                <span>Execute CPB</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Status Monitor */}
                {(status || result) && (
                    <CPBMonitorPanel status={status} lastResult={result} />
                )}

                {/* Error Display */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <AlertCircle size={16} />
                            <span className="font-medium">Error</span>
                        </div>
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {/* Result Display */}
                {result && (
                    <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-green-400" />
                                <span className="font-medium">Result</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>Path: <span className="text-purple-400">{result.path}</span></span>
                                <span>DQ: <span className="text-cyan-400">{(result.dqScore.score * 100).toFixed(0)}%</span></span>
                                <span>Time: <span className="text-green-400">{(result.executionTimeMs / 1000).toFixed(1)}s</span></span>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800 font-mono text-sm whitespace-pre-wrap">
                            {result.output}
                        </div>
                    </div>
                )}

                {/* Quick Test Queries */}
                <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                    <div className="text-sm text-gray-400 mb-3">Quick Tests</div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: 'Simple (Direct)', query: 'What is 2 + 2?' },
                            { label: 'Navigation', query: 'Navigate to the dashboard' },
                            { label: 'Analysis (ACE)', query: 'Compare the trade-offs between REST and GraphQL APIs' },
                            { label: 'Architecture (Hybrid)', query: 'Design a microservices architecture for a real-time chat application' },
                        ].map((test) => (
                            <button
                                key={test.label}
                                onClick={() => setQuery(test.query)}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
                            >
                                {test.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CPBTest;
