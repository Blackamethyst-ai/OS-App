import React, { useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scan, Download, Terminal, BrainCircuit, Loader2, Copy, FileText, Code, Image as ImageIcon, Wand2, Edit, Check, Zap } from 'lucide-react';
import { promptSelectKey, transformArtifact, retryGeminiRequest } from '../services/geminiService';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

const HoloProjector: React.FC = () => {
    const { holo, closeHoloProjector, setHoloAnalysis, setHoloAnalyzing, openHoloProjector } = useAppStore();
    const [isTransforming, setIsTransforming] = useState(false);

    const handleAnalyze = async () => {
        if (!holo.activeArtifact) return;
        setHoloAnalyzing(true);
        setHoloAnalysis(null);

        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) {
                await promptSelectKey();
                setHoloAnalyzing(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = "Analyze this artifact in detail. Identify key features, potential optimizations, and hidden patterns. Keep it technical and concise.";
            // Use gemini-3-flash-preview for standard text analysis tasks.
            let model = 'gemini-3-flash-preview';
            let content: any = null;

            if (holo.activeArtifact.type === 'IMAGE') {
                // Use gemini-3-flash-preview for multi-modal analysis.
                model = 'gemini-3-flash-preview';
                // Assuming content is base64 data url
                const base64Data = (holo.activeArtifact.content as string).split(',')[1];
                content = {
                    inlineData: { mimeType: 'image/png', data: base64Data }
                };
            } else if (holo.activeArtifact.type === 'CODE') {
                prompt = `Analyze this code snippet. Explain its function, time complexity, and suggest one improvement.\n\nCode:\n${holo.activeArtifact.content}`;
            } else {
                prompt = `Analyze this text:\n\n${holo.activeArtifact.content}`;
            }

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model,
                contents: content ? { parts: [content, { text: prompt }] } : prompt
            }));

            setHoloAnalysis(response.text || "Analysis complete. No output generated.");

        } catch (err: any) {
            setHoloAnalysis(`Error: ${err.message}`);
        } finally {
            setHoloAnalyzing(false);
        }
    };

    const handleTransform = async (instruction: string) => {
        if (!holo.activeArtifact) return;
        setIsTransforming(true);
        
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) await promptSelectKey();

            const transformed = await transformArtifact(
                holo.activeArtifact.content,
                holo.activeArtifact.type as any,
                instruction
            );

            // Update content in place
            openHoloProjector({
                ...holo.activeArtifact,
                content: transformed
            });

        } catch (err: any) {
            console.error("Transform failed", err);
            setHoloAnalysis(`Transformation Error: ${err.message}`);
        } finally {
            setIsTransforming(false);
        }
    };

    if (!holo.isOpen || !holo.activeArtifact) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md perspective-1000"
                onClick={closeHoloProjector}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateX: 10 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotateX: -10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-[90vw] h-[85vh] bg-[#050505] border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(157,78,221,0.15)] group"
                >
                    {/* Holo Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    
                    {/* Header */}
                    <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 flex items-center justify-between px-6 z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                                {holo.activeArtifact.type === 'IMAGE' && <ImageIcon className="w-5 h-5 text-[#9d4edd]" />}
                                {holo.activeArtifact.type === 'CODE' && <Code className="w-5 h-5 text-[#9d4edd]" />}
                                {holo.activeArtifact.type === 'TEXT' && <FileText className="w-5 h-5 text-[#9d4edd]" />}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white font-mono tracking-widest uppercase">{holo.activeArtifact.title}</h2>
                                <p className="text-[10px] text-gray-500 font-mono">Holo-Projection // {holo.activeArtifact.type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleAnalyze} disabled={holo.isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-50">
                                {holo.isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <BrainCircuit className="w-3 h-3" />}
                                Deep Scan
                            </button>
                            <button onClick={closeHoloProjector} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex overflow-hidden relative z-10">
                        {/* Artifact View */}
                        <div className="flex-1 flex items-center justify-center p-8 bg-black/50 relative overflow-auto custom-scrollbar flex-col">
                            {holo.activeArtifact.type === 'IMAGE' && (
                                <img 
                                    src={holo.activeArtifact.content as string} 
                                    className="max-w-full max-h-full object-contain border border-[#333] shadow-2xl" 
                                    alt="Holo Artifact" 
                                />
                            )}
                            {holo.activeArtifact.type === 'CODE' && (
                                <div className="w-full h-full relative">
                                    {isTransforming && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                                            <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin" />
                                        </div>
                                    )}
                                    <pre className="w-full h-full p-6 bg-[#080808] border border-[#222] rounded text-xs font-mono text-gray-300 overflow-auto whitespace-pre-wrap">
                                        {holo.activeArtifact.content as string}
                                    </pre>
                                </div>
                            )}
                            {holo.activeArtifact.type === 'TEXT' && (
                                <div className="w-full h-full relative">
                                    {isTransforming && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                                            <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin" />
                                        </div>
                                    )}
                                    <div className="w-full h-full max-w-3xl p-8 bg-[#080808] border border-[#222] rounded text-sm font-mono text-gray-300 overflow-auto leading-relaxed mx-auto">
                                        {holo.activeArtifact.content as string}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analysis Sidebar */}
                        <AnimatePresence>
                            {holo.analysisResult && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 350, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="border-l border-[#1f1f1f] bg-[#0a0a0a] flex flex-col shrink-0"
                                >
                                    <div className="h-10 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#111]">
                                        <span className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider flex items-center gap-2">
                                            <Terminal className="w-3 h-3" /> Analysis Result
                                        </span>
                                        <button onClick={() => setHoloAnalysis(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar text-xs font-mono text-gray-400 leading-relaxed whitespace-pre-wrap">
                                        {holo.analysisResult}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Active Workbench Toolbar */}
                    {(holo.activeArtifact.type === 'CODE' || holo.activeArtifact.type === 'TEXT') && (
                        <div className="h-12 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-center gap-4 px-4 relative z-20">
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest absolute left-4">Transformation Matrix</span>
                            
                            {holo.activeArtifact.type === 'CODE' && (
                                <>
                                    <button onClick={() => handleTransform('Refactor code for cleanliness and performance. Keep functionality.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <Wand2 className="w-3 h-3" /> Refactor
                                    </button>
                                    <button onClick={() => handleTransform('Find potential bugs and security vulnerabilities. Add comments explaining fixes.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-red-900/30 hover:text-red-400 hover:border-red-500 border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <Scan className="w-3 h-3" /> Debug Scan
                                    </button>
                                    <button onClick={() => handleTransform('Add detailed JSDoc/Docstring comments to all functions.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <FileText className="w-3 h-3" /> Document
                                    </button>
                                </>
                            )}

                            {holo.activeArtifact.type === 'TEXT' && (
                                <>
                                    <button onClick={() => handleTransform('Summarize this text into 3 key bullet points.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <FileText className="w-3 h-3" /> Summarize
                                    </button>
                                    <button onClick={() => handleTransform('Expand this text with more detailed explanations and examples.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <Edit className="w-3 h-3" /> Expand
                                    </button>
                                    <button onClick={() => handleTransform('Rewrite this text to be more professional and concise.')} className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase tracking-wider transition-all">
                                        <Wand2 className="w-3 h-3" /> Polish
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Footer / Decorative (If not showing toolbar) */}
                    {holo.activeArtifact.type === 'IMAGE' && (
                        <div className="h-8 border-t border-[#1f1f1f] bg-[#050505] flex items-center justify-between px-4 text-[9px] font-mono text-gray-600">
                            <span>SOVEREIGN ARCHITECTURE v3.0</span>
                            <span>SECURE VIEWPORT</span>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default HoloProjector;