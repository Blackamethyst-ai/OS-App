
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize, GeneratedImage } from '../types';
import { Download, Sparkles, Image as ImageIcon, Wand2, Layers, Monitor, AlertCircle, RefreshCw, Grid, FileImage, Upload, X, Check } from 'lucide-react';

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

      // Pass referenceImage (style reference) if it exists
      const imageUrl = await generateArchitectureImage(
          state.prompt, 
          state.aspectRatio, 
          state.size, 
          state.referenceImage || undefined
      );
      
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

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          try {
              const file = e.target.files[0];
              const fileData = await fileToGenerativePart(file);
              setImageGenState({ referenceImage: fileData });
          } catch (err) {
              console.error("Reference upload failed", err);
              setImageGenState({ error: "Failed to load reference image" });
          }
      }
  };

  const clearReference = () => {
      setImageGenState({ referenceImage: null });
  };

  // Visual aspect ratio options
  const aspectRatios = [
      { val: AspectRatio.RATIO_1_1, label: '1:1', w: 24, h: 24 },
      { val: AspectRatio.RATIO_4_3, label: '4:3', w: 32, h: 24 },
      { val: AspectRatio.RATIO_3_4, label: '3:4', w: 24, h: 32 },
      { val: AspectRatio.RATIO_16_9, label: '16:9', w: 40, h: 22 },
      { val: AspectRatio.RATIO_9_16, label: '9:16', w: 22, h: 40 },
      { val: AspectRatio.RATIO_21_9, label: '21:9', w: 44, h: 18 }
  ];

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
          
          <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar">
            
            {/* Aspect Ratio Grid */}
            <div>
                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3 block flex items-center">
                    <Monitor className="w-3 h-3 mr-1.5" /> Dimensions
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {aspectRatios.map((ratio) => (
                        <button
                            key={ratio.val}
                            onClick={() => setImageGenState({ aspectRatio: ratio.val })}
                            className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${
                                state.aspectRatio === ratio.val 
                                ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-white' 
                                : 'bg-[#111] border-[#333] text-gray-500 hover:border-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <div 
                                className="border border-current mb-1 opacity-80"
                                style={{ width: ratio.w, height: ratio.h }}
                            ></div>
                            <span className="text-[8px] font-mono">{ratio.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Resolution Selector */}
            <div>
                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-2 block flex items-center">
                    <Layers className="w-3 h-3 mr-1.5" /> Quality Matrix
                </label>
                <div className="flex bg-[#111] rounded border border-[#333] p-1">
                    {Object.values(ImageSize).map((s) => (
                        <button
                            key={s}
                            onClick={() => setImageGenState({ size: s })}
                            className={`flex-1 py-1.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-sm transition-all ${
                                state.size === s 
                                ? 'bg-[#9d4edd] text-black shadow-sm' 
                                : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Style Reference Upload */}
            <div>
                <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3 block flex items-center justify-between">
                    <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1.5" /> Style Reference</span>
                    <span className="text-[8px] text-gray-600 bg-[#111] px-1.5 py-0.5 rounded border border-[#222]">OPTIONAL</span>
                </label>
                
                {state.referenceImage ? (
                    <div className="relative group">
                        <div className="w-full h-32 bg-[#050505] rounded border border-[#9d4edd]/50 overflow-hidden relative">
                            <img 
                                src={`data:${state.referenceImage.inlineData.mimeType};base64,${state.referenceImage.inlineData.data}`} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                alt="Reference"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                                <span className="text-[9px] font-mono text-white truncate w-full">{state.referenceImage.name}</span>
                            </div>
                        </div>
                        <button 
                            onClick={clearReference}
                            className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded shadow-lg transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <div className="absolute top-2 left-2 p-1 bg-[#9d4edd]/80 text-black rounded font-bold text-[8px] font-mono uppercase px-2">
                            Active Ref
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] rounded cursor-pointer hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all group bg-[#050505]">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 text-gray-600 mb-2 group-hover:text-[#9d4edd] group-hover:scale-110 transition-transform" />
                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wide group-hover:text-gray-300">Upload Image</p>
                        </div>
                        <input type="file" onChange={handleReferenceUpload} className="hidden" accept="image/*" />
                    </label>
                )}
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
                        className="w-full h-full bg-[#050505] border border-[#333] p-4 text-gray-300 focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd]/20 focus:outline-none resize-none text-xs leading-relaxed font-mono placeholder:text-gray-700 rounded-sm"
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
                className={`w-full py-4 flex items-center justify-center font-bold text-[10px] tracking-[0.2em] uppercase font-mono transition-all rounded-sm border
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
