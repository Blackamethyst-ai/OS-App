
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey } from '../services/geminiService';
import { AspectRatio, ImageSize, GeneratedImage } from '../types';
import { Download, Sparkles, Image as ImageIcon, Wand2, Layers, Monitor, AlertCircle, RefreshCw, Grid, FileImage } from 'lucide-react';

const ImageGen: React.FC = () => {
  const { imageGen: state, setImageGenState } = useAppStore();

  const handleGenerate = async () => {
    if (!state.prompt) return;
    setImageGenState({ isLoading: true, error: null });

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
          await promptSelectKey();
          setImageGenState({ isLoading: false });
          return;
      }

      const imageUrl = await generateArchitectureImage(state.prompt, state.aspectRatio, state.size, undefined);
      setImageGenState({
        generatedImage: {
            url: imageUrl,
            prompt: state.prompt,
            aspectRatio: state.aspectRatio,
            size: state.size
        },
        isLoading: false
      });
    } catch (err: any) {
      if (err.message?.includes("API Key")) {
         setImageGenState({ error: "API Key required for Pro Image model." });
         await promptSelectKey();
      } else {
        setImageGenState({ error: err.message || "Failed to generate image." });
      }
      setImageGenState({ isLoading: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-6rem)] rounded border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden font-sans">
      
      {/* 1. Sidebar: Pro Controls */}
      <div className="lg:col-span-3 bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col relative z-20">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center font-mono">
               <Wand2 className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Asset Studio
            </h2>
         </div>
          
          <div className="flex-1 flex flex-col p-5 gap-8 overflow-y-auto custom-scrollbar">
            
            {/* Parameters Group */}
            <div>
                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3 block">Output Parameters</label>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wide flex items-center">
                            <Monitor className="w-3 h-3 mr-2" /> Aspect Ratio
                        </label>
                        <div className="relative group">
                            <select
                                value={state.aspectRatio}
                                onChange={(e) => setImageGenState({ aspectRatio: e.target.value as AspectRatio })}
                                className="w-full bg-[#050505] border border-[#333] rounded-sm p-2.5 text-gray-300 text-xs font-mono focus:border-[#9d4edd] outline-none appearance-none hover:bg-[#111] transition-colors cursor-pointer"
                            >
                                {Object.values(AspectRatio).map((ratio) => (
                                <option key={ratio} value={ratio}>{ratio}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none">
                                <div className="w-2 h-2 border-b border-r border-gray-500 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wide flex items-center">
                            <Layers className="w-3 h-3 mr-2" /> Resolution
                        </label>
                        <div className="relative group">
                            <select
                                value={state.size}
                                onChange={(e) => setImageGenState({ size: e.target.value as ImageSize })}
                                className="w-full bg-[#050505] border border-[#333] rounded-sm p-2.5 text-gray-300 text-xs font-mono focus:border-[#9d4edd] outline-none appearance-none hover:bg-[#111] transition-colors cursor-pointer"
                            >
                                {Object.values(ImageSize).map((s) => (
                                <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none">
                                <div className="w-2 h-2 border-b border-r border-gray-500 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Prompt Group */}
            <div className="flex-1 flex flex-col min-h-0">
                <label className="flex justify-between text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3">
                    <span>Prompt Directive</span>
                    <span className="text-gray-600">REQ. INPUT</span>
                </label>
                <div className="relative flex-1">
                    <textarea
                        value={state.prompt}
                        onChange={(e) => setImageGenState({ prompt: e.target.value })}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe the architectural asset..."
                        className="w-full h-full bg-[#050505] border border-[#333] p-4 text-gray-300 focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 focus:outline-none resize-none text-xs leading-relaxed font-mono placeholder:text-gray-700"
                    />
                    <div className="absolute bottom-2 right-2 text-[9px] text-gray-700 font-mono">
                        CMD+ENTER to RUN
                    </div>
                </div>
            </div>
            
            {state.error && (
              <div className="p-3 bg-[#da1e28]/10 border border-[#da1e28]/30 text-[#da1e28] text-[10px] flex items-start font-mono animate-in slide-in-from-left-2">
                <AlertCircle className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
                {state.error}
              </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={state.isLoading || !state.prompt}
                className={`w-full py-4 flex items-center justify-center font-bold text-[10px] tracking-[0.2em] uppercase font-mono transition-all border
                  ${state.isLoading || !state.prompt 
                    ? 'bg-[#111] border-[#1f1f1f] text-gray-700 cursor-not-allowed' 
                    : 'bg-[#9d4edd] border-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.5)]'}`}
              >
                {state.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    PROCESSING
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    GENERATE ASSET
                  </>
                )}
            </button>
          </div>
      </div>

      {/* 2. Main Stage: Holographic Grid */}
      <div className="lg:col-span-9 bg-[#030303] relative flex items-center justify-center overflow-hidden">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030303_90%)] pointer-events-none"></div>

        {state.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-sm transition-all">
                <div className="relative">
                    <div className="w-20 h-20 border-t-2 border-l-2 border-[#9d4edd] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 border-b-2 border-r-2 border-[#9d4edd]/30 rounded-full animate-spin-reverse"></div>
                </div>
                <div className="mt-8 flex flex-col items-center gap-1">
                    <p className="text-[#9d4edd] font-mono text-xs tracking-[0.2em] uppercase animate-pulse">Rendering Artifact</p>
                    <p className="text-gray-600 font-mono text-[10px]">Model 3.0 Processing...</p>
                </div>
                {/* Scanline Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[#9d4edd]/50 shadow-[0_0_15px_#9d4edd] animate-[scan_2s_linear_infinite]"></div>
            </div>
        )}
        
        {state.generatedImage ? (
            <div className="relative w-full h-full p-12 flex flex-col items-center justify-center">
                <div className="relative shadow-2xl overflow-hidden border border-[#333] group bg-black/50 backdrop-blur-sm max-h-full max-w-full">
                    {/* Corner Reticles */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#9d4edd] z-10"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#9d4edd] z-10"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#9d4edd] z-10"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#9d4edd] z-10"></div>

                    <img 
                        src={state.generatedImage.url} 
                        alt={state.generatedImage.prompt}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                    
                    {/* HUD Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 duration-300">
                        <div className="flex items-end justify-between">
                            <div className="max-w-2xl">
                                <div className="text-[#9d4edd] text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FileImage className="w-3 h-3" />
                                    Asset Generated
                                </div>
                                <p className="text-gray-300 text-xs font-mono line-clamp-2 leading-relaxed opacity-90">{state.generatedImage.prompt}</p>
                                <div className="flex gap-2 mt-3">
                                    <span className="text-[9px] uppercase tracking-wider bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] px-2 py-0.5 font-mono">{state.generatedImage.size}</span>
                                    <span className="text-[9px] uppercase tracking-wider bg-[#1f1f1f] border border-[#333] text-gray-400 px-2 py-0.5 font-mono">{state.generatedImage.aspectRatio}</span>
                                </div>
                            </div>
                            <a 
                                href={state.generatedImage.url} 
                                download={`structura-asset-${Date.now()}.png`}
                                className="px-6 py-3 bg-[#9d4edd] hover:bg-[#b06bf7] text-black text-[10px] font-bold uppercase tracking-widest flex items-center shadow-[0_0_20px_rgba(157,78,221,0.3)] font-mono transition-all transform hover:translate-y-[-2px]"
                            >
                                <Download className="w-3.5 h-3.5 mr-2" />
                                Save
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center relative z-10 p-12 border border-[#1f1f1f] bg-[#0a0a0a]/50 backdrop-blur rounded-lg">
                <div className="w-24 h-24 bg-[#050505] flex items-center justify-center mx-auto mb-8 border border-[#1f1f1f] rounded-full shadow-[0_0_40px_-10px_rgba(157,78,221,0.15)] group hover:border-[#9d4edd]/50 transition-colors">
                    <Grid className="w-10 h-10 text-gray-700 group-hover:text-[#9d4edd] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-[0.25em] font-mono">System Idle</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto font-mono leading-relaxed">
                    Configure parameters in the left control deck and initialize the generative sequence.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageGen;
