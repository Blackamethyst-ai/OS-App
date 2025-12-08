
import React, { useState } from 'react';
import { generateArchitectureImage, promptSelectKey } from '../services/geminiService';
import { AspectRatio, ImageSize, GeneratedImage } from '../types';
import { Download, Sparkles, Image as ImageIcon, Wand2, Layers, Monitor, AlertCircle, RefreshCw } from 'lucide-react';

const ImageGen: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.RATIO_1_1);
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError(null);

    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
          await promptSelectKey();
          setIsLoading(false);
          return;
      }

      const imageUrl = await generateArchitectureImage(prompt, aspectRatio, size);
      setGeneratedImage({
        url: imageUrl,
        prompt,
        aspectRatio,
        size
      });
    } catch (err: any) {
      if (err.message?.includes("API Key")) {
         setError("API Key required for Pro Image model.");
         await promptSelectKey();
      } else {
        setError(err.message || "Failed to generate image.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-6rem)] rounded border border-[#1f1f1f] bg-[#030303] shadow-2xl overflow-hidden">
      {/* Controls Section - Sidebar */}
      <div className="lg:col-span-3 bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col relative z-20">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <Wand2 className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Asset Studio
            </h2>
         </div>
          
          <div className="space-y-6 flex-1 flex flex-col p-4">
            {/* Parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center">
                  <Monitor className="w-3 h-3 mr-1" /> Aspect
                </label>
                <div className="relative">
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full bg-[#050505] border border-[#333] rounded-none p-2 text-gray-300 text-xs font-mono focus:border-[#9d4edd] outline-none appearance-none hover:bg-[#111]"
                  >
                    {Object.values(AspectRatio).map((ratio) => (
                      <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center">
                  <Layers className="w-3 h-3 mr-1" /> Res
                </label>
                <div className="relative">
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as ImageSize)}
                    className="w-full bg-[#050505] border border-[#333] rounded-none p-2 text-gray-300 text-xs font-mono focus:border-[#9d4edd] outline-none appearance-none hover:bg-[#111]"
                  >
                    {Object.values(ImageSize).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                <span>Prompt Directive</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe high-fidelity isometric system diagrams, futuristic interfaces, or architectural schematics..."
                className="w-full flex-1 bg-[#050505] border border-[#333] p-4 text-gray-300 focus:border-[#9d4edd] focus:outline-none resize-none text-xs leading-relaxed font-mono"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt}
                className={`mt-4 w-full py-3 px-4 flex items-center justify-center font-bold text-[10px] tracking-[0.15em] uppercase font-mono transition-all border
                  ${isLoading || !prompt 
                    ? 'bg-[#111] border-[#1f1f1f] text-gray-700 cursor-not-allowed' 
                    : 'bg-[#9d4edd] border-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_15px_rgba(157,78,221,0.3)]'}`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    RENDERING
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    GENERATE ASSET
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/10 border border-red-900/30 text-red-400 text-xs flex items-start font-mono">
                <AlertCircle className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
      </div>

      {/* Output Display */}
      <div className="lg:col-span-9 bg-[#030303] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80 backdrop-blur-sm transition-all">
            <div className="w-16 h-16 border-2 border-[#9d4edd]/30 border-t-[#9d4edd] rounded-full animate-spin mb-6"></div>
            <p className="text-[#9d4edd] font-mono text-xs tracking-[0.2em] uppercase animate-pulse">Model 3.0 Processing...</p>
            </div>
        )}
        
        {generatedImage ? (
            <div className="relative w-full h-full p-12 flex flex-col items-center justify-center">
            <div className="relative max-w-full max-h-full shadow-2xl overflow-hidden border border-[#333] group">
                <img 
                src={generatedImage.url} 
                alt={generatedImage.prompt}
                className="max-w-full max-h-[85vh] object-contain bg-black"
                />
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                    <div className="flex items-end justify-between">
                    <div>
                        <p className="text-white text-xs font-mono mb-2 line-clamp-1 max-w-lg opacity-80">{generatedImage.prompt}</p>
                        <div className="flex gap-2">
                        <span className="text-[10px] uppercase tracking-wider bg-black/40 border border-[#333] text-gray-300 px-2 py-1 font-mono">{generatedImage.size}</span>
                        <span className="text-[10px] uppercase tracking-wider bg-black/40 border border-[#333] text-gray-300 px-2 py-1 font-mono">{generatedImage.aspectRatio}</span>
                        </div>
                    </div>
                    <a 
                    href={generatedImage.url} 
                    download={`structura-asset-${Date.now()}.png`}
                    className="px-4 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black text-xs font-bold uppercase tracking-wider flex items-center shadow-lg font-mono"
                    >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Save Asset
                    </a>
                    </div>
                </div>
            </div>
            </div>
        ) : (
            <div className="text-center text-gray-600 relative z-10 p-8">
                <div className="w-24 h-24 bg-[#0a0a0a] flex items-center justify-center mx-auto mb-6 border border-[#1f1f1f] shadow-[0_0_30px_-10px_rgba(157,78,221,0.1)]">
                    <ImageIcon className="w-10 h-10 opacity-50 text-[#9d4edd]" />
                </div>
                <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-[0.2em] font-mono">Asset Studio</h3>
                <p className="text-xs opacity-60 max-w-xs mx-auto font-mono">
                    High-fidelity generation for architectural and systemic visualization.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageGen;
