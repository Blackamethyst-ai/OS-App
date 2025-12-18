import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY, MINT_NOIR_COLORWAY, AMBER_PROTOCOL_COLORWAY } from '../types';
import { promptSelectKey, fileToGenerativePart, generateStoryboardPlan, constructCinematicPrompt, retryGeminiRequest, analyzeImageVision } from '../services/geminiService';
import { Image as ImageIcon, Loader2, RefreshCw, Download, Plus, Trash2, Film, Wand2, Upload, X, Layers, AlertCircle, Eye, Activity, User, Palette, FileText, ChevronRight, MonitorPlay, Zap, Clapperboard, Play, Maximize, ToggleLeft, ToggleRight, Volume2, VolumeX, SkipForward, Globe, Lock, Unlock, Fingerprint, Cpu, Radio, Power, Box, Camera, Sun, Video, Package, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionalResonanceGraph from './EmotionalResonanceGraph';
import { useVoiceAction } from '../hooks/useVoiceAction';

// Storyboard Frame Interface
interface Frame {
  index: number;
  scenePrompt: string;
  continuity: string;
  camera?: string; // New: Cinematic Metadata
  lighting?: string; // New: Cinematic Metadata
  audio_cue?: string; // New: Sound Design
  status: 'pending' | 'generating' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
  imageData?: FileData;
  isDraft?: boolean; 
}

const STYLE_PRESETS = [
    { id: 'CINEMATIC_REALISM', label: 'Cinematic Realism', desc: '8K, Unreal Engine 5, Highly Detailed' },
    { id: 'CYBER_NOIR', label: 'Cyber-Noir', desc: 'Neon, Wet Surfaces, High Contrast, Chromatic Aberration' },
    { id: 'ETHEREAL_SOLARPUNK', label: 'Ethereal Solarpunk', desc: 'Golden Hour, Biomimetic, Lush Greenery, Hopeful' },
    { id: 'ANALOG_HORROR', label: 'Analog Horror', desc: 'VHS Grain, Liminal Spaces, Flash Photography' },
    { id: 'STUDIO_GHIBLI', label: 'Anime Art (Ghibli)', desc: 'Hand-painted, Vibrant Colors, Cel-Shaded' },
    { id: 'GRITTY_REALISM', label: 'Gritty Realism', desc: '35mm Grain, Desaturated, Tactical, Raw' },
];

const MultiReferenceSlot: React.FC<{ label: string, icon: any, files: FileData[], onRemove: (idx: number) => void, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, accept: string }> = ({ label, icon: Icon, files, onRemove, onUpload, accept }) => (
    <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#222] hover:border-[#333] transition-colors group">
        <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider flex items-center gap-2 font-bold">
                <Icon className="w-3 h-3" /> {label}
            </label>
            <span className="text-[9px] text-gray-600 font-mono">{files.length} ASSETS</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-2">
            {files.map((file, idx) => (
                <div key={idx} className="relative group/item aspect-square bg-black border border-[#333] rounded-lg overflow-hidden shadow-sm">
                    {file.inlineData.mimeType.startsWith('image/') ? (
                        <img src={`data:${file.inlineData.mimeType};base64,${file.inlineData.data}`} className="w-full h-full object-cover opacity-80 group-hover/item:opacity-100 transition-opacity" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600"><FileText className="w-4 h-4"/></div>
                    )}
                    <button 
                        onClick={() => onRemove(idx)} 
                        className="absolute top-0 right-0 bg-red-500/80 text-white p-1 opacity-0 group-hover/item:opacity-100 transition-opacity rounded-bl-lg backdrop-blur-sm"
                    >
                        <X className="w-2 h-2" />
                    </button>
                </div>
            ))}
            <label className="flex flex-col items-center justify-center aspect-square bg-[#0a0a0a] border border-dashed border-[#333] rounded-lg cursor-pointer hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all group/add">
                <Plus className="w-4 h-4 text-gray-600 group-hover/add:text-[#9d4edd]" />
                <input type="file" multiple className="hidden" onChange={onUpload} accept={accept} />
            </label>
        </div>
    </div>
);

// --- GENESIS TEASER / DYNAMIC TRAILER ENGINE ---

// 1. Procedural Glitch Text
const GlitchText: React.FC<{ text: string, isActive: boolean, className?: string, onComplete?: () => void }> = ({ text, isActive, className, onComplete }) => {
    const [display, setDisplay] = useState('');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&¥§±Æ';
    
    useEffect(() => {
        if (!isActive) return;
        
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplay(
                text.split('').map((letter, index) => {
                    if (index < iteration) {
                        return text[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('')
            );
            
            if (iteration >= text.length) {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
            
            iteration += 1 / 2; 
        }, 30);
        
        return () => clearInterval(interval);
    }, [isActive, text]);

    return <span className={`font-mono ${className}`}>{display || (isActive ? '' : text)}</span>;
};

// 2. Data Tunnel (Background)
const DataTunnel: React.FC<{ speed: number, color: string }> = ({ speed, color }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            mousePos.current = { 
                x: (e.clientX / window.innerWidth) * 2 - 1, 
                y: (e.clientY / window.innerHeight) * 2 - 1 
            };
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const chars = '01';
        const particleCount = 400;
        const particles: { x: number, y: number, z: number, char: string }[] = [];

        // Init
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: (Math.random() - 0.5) * window.innerWidth,
                y: (Math.random() - 0.5) * window.innerHeight,
                z: Math.random() * 2000,
                char: chars[Math.floor(Math.random() * chars.length)]
            });
        }

        let animId: number;

        const render = () => {
            canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Sort by depth
            particles.sort((a, b) => b.z - a.z);

            particles.forEach(p => {
                p.z -= speed;
                if (p.z <= 0) p.z = 2000;

                const scale = 500 / p.z;
                const x2d = (p.x - mousePos.current.x * 200) * scale + cx;
                const y2d = (p.y - mousePos.current.y * 200) * scale + cy;

                const alpha = Math.min(1, (2000 - p.z) / 1000);
                ctx.globalAlpha = alpha;
                ctx.font = `${12 * scale}px Fira Code`;
                ctx.fillStyle = color;
                ctx.fillText(p.char, x2d, y2d);
            });

            animId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animId);
    }, [speed, color]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />;
};

// 3. Dynamic Trailer Engine (The Core Upgrade)
const GenesisTeaser: React.FC<{ frames: Frame[] }> = ({ frames }) => {
    const { user, setMode } = useAppStore();
    const [bootPhase, setBootPhase] = useState<'IDLE' | 'PLAYBACK' | 'READY'>('IDLE');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [activeText, setActiveText] = useState<string>('');
    const [tunnelSpeed, setTunnelSpeed] = useState(2); 

    // Extract valid frames (either image or text)
    const validFrames = frames.filter(f => f.imageUrl || f.scenePrompt);
    const hasContent = validFrames.length > 0;

    useEffect(() => {
        if (bootPhase === 'PLAYBACK') {
            setTunnelSpeed(15); // Warp Speed during playback
            const interval = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= validFrames.length - 1) {
                        clearInterval(interval);
                        setBootPhase('READY');
                        setTunnelSpeed(2); // Slow down
                        return prev;
                    }
                    return prev + 1;
                });
            }, 3000); // 3 seconds per frame
            
            return () => clearInterval(interval);
        }
    }, [bootPhase, validFrames.length]);

    useEffect(() => {
        if (bootPhase === 'PLAYBACK' && validFrames[currentIndex]) {
            setActiveImage(validFrames[currentIndex].imageUrl || null);
            setActiveText(validFrames[currentIndex].scenePrompt.substring(0, 100) + "...");
        }
    }, [currentIndex, bootPhase, validFrames]);

    const handleInitialize = () => {
        if (hasContent) {
            setBootPhase('PLAYBACK');
            setCurrentIndex(0);
        } else {
            // Fallback generic boot
            setBootPhase('READY');
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden font-mono select-none">
            
            {/* Layer 0: Background Image (If active) */}
            <AnimatePresence mode="wait">
                {activeImage && bootPhase === 'PLAYBACK' && (
                    <motion.img 
                        key={activeImage}
                        src={activeImage}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 w-full h-full object-cover z-0 grayscale contrast-125"
                    />
                )}
            </AnimatePresence>

            {/* Layer 1: Data Tunnel Overlay */}
            <DataTunnel speed={tunnelSpeed} color={bootPhase === 'READY' ? '#9d4edd' : '#22d3ee'} />
            
            {/* Layer 2: Vignette & Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_80%)] pointer-events-none z-10"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50 z-10"></div>

            {/* Layer 3: Main Interface */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-12">
                
                {/* Visualizer / Center Icon */}
                <div className="mb-8 relative scale-150">
                    {bootPhase === 'IDLE' && <Fingerprint className="w-16 h-16 text-[#333]" />}
                    {bootPhase === 'PLAYBACK' && <Activity className="w-16 h-16 text-[#22d3ee] animate-pulse" />}
                    {bootPhase === 'READY' && <Unlock className="w-16 h-16 text-[#9d4edd]" />}
                </div>

                {/* Text Content */}
                <div className="h-40 flex flex-col items-center justify-center space-y-4 z-20 w-full max-w-2xl text-center">
                    {bootPhase === 'IDLE' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                            <h1 className="text-4xl font-black tracking-[0.5em] text-white mb-3">GENESIS TEASER</h1>
                            <p className="text-sm text-gray-500 tracking-[0.3em] uppercase">
                                {hasContent ? "Asset Sequence Ready // Initialize Playback" : "System Standby // No Assets Loaded"}
                            </p>
                        </motion.div>
                    )}

                    {bootPhase === 'PLAYBACK' && (
                        <div className="text-center space-y-4 w-full">
                            <GlitchText 
                                text={`SEQUENCE ${currentIndex + 1} / ${validFrames.length}`} 
                                isActive={true} 
                                className="text-sm text-[#22d3ee] tracking-[0.2em] font-bold block mb-2" 
                            />
                            <motion.div
                                key={activeText}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-lg text-white font-bold leading-relaxed drop-shadow-md bg-black/50 p-4 rounded border border-[#22d3ee]/20 backdrop-blur-sm"
                            >
                                "{activeText}"
                            </motion.div>
                        </div>
                    )}

                    {bootPhase === 'READY' && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <h1 className="text-5xl font-black tracking-[0.2em] text-[#9d4edd] mb-6 drop-shadow-[0_0_25px_rgba(157,78,221,0.6)]">
                                SYSTEM ONLINE
                            </h1>
                            <p className="text-sm text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed font-mono">
                                Welcome back, <span className="text-white font-bold">{user.displayName.toUpperCase()}</span>. 
                                <br/>The Sovereign Architecture awaits your command.
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Interaction Buttons */}
                <div className="mt-12 z-20">
                    {bootPhase === 'IDLE' && (
                        <button 
                            onClick={handleInitialize}
                            className="group relative px-10 py-4 bg-black border border-[#333] hover:border-[#22d3ee] text-gray-300 hover:text-[#22d3ee] transition-all rounded-none uppercase tracking-[0.3em] text-xs font-bold overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <Power className="w-4 h-4" /> {hasContent ? "PLAY SEQUENCE" : "INITIALIZE"}
                            </span>
                            <div className="absolute inset-0 bg-[#22d3ee]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out"></div>
                        </button>
                    )}

                    {bootPhase === 'READY' && (
                        <button 
                            onClick={() => setMode('DASHBOARD' as any)} 
                            className="group relative px-12 py-5 bg-[#9d4edd] text-black rounded-none uppercase tracking-[0.3em] text-sm font-black transition-all shadow-[0_0_40px_rgba(157,78,221,0.4)] hover:shadow-[0_0_60px_rgba(157,78,221,0.6)] hover:scale-105"
                        >
                            <span className="flex items-center gap-4">
                                ENTER SYSTEM <ChevronRight className="w-5 h-5" />
                            </span>
                        </button>
                    )}
                </div>

            </div>

            {/* Footer Status */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-between text-[9px] text-gray-600 font-mono tracking-widest uppercase z-20">
                <span>Metaventions AI v3.0.1</span>
                <span className={bootPhase === 'READY' ? 'text-[#9d4edd] animate-pulse' : ''}>
                    {bootPhase === 'IDLE' ? 'STANDBY' : bootPhase === 'READY' ? 'ONLINE' : 'PROCESSING...'}
                </span>
            </div>
        </div>
    );
};

// --- END BOOT COMPONENTS ---

const ImageGen: React.FC = () => {
  const { imageGen, setImageGenState, addLog } = useAppStore();
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'TEASER'>('SINGLE');
  
  // Storyboard State
  const [frames, setFrames] = useState<Frame[]>([]);
  const [showERT, setShowERT] = useState(true);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [activeFramePrompt, setActiveFramePrompt] = useState<string>("");
  
  // Batch & AI Controls
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 }); // NEW: Batch Tracking
  const [isPlanning, setIsPlanning] = useState(false);
  const [draftMode, setDraftMode] = useState(true); // Default to Draft to save quota

  // Vision State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<FileData | null>(null);
  
  // Init frames
  useEffect(() => {
      if (frames.length === 0) {
          setFrames(Array.from({ length: 5 }, (_, i) => ({ index: i, scenePrompt: '', continuity: '', status: 'pending' })));
      }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'character' | 'style' | 'base') => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles: FileData[] = [];
          for (let i = 0; i < e.target.files.length; i++) {
              try {
                  const file = e.target.files[i];
                  const data = await fileToGenerativePart(file);
                  newFiles.push(data);
              } catch (err) {
                  console.error(err);
                  addLog('ERROR', `Failed to upload ${e.target.files[i].name}`);
              }
          }
          
          if (target === 'character') {
              setImageGenState({ characterRefs: [...(imageGen.characterRefs || []), ...newFiles] });
              addLog('SUCCESS', `Added ${newFiles.length} Character Refs`);
          } else if (target === 'style') {
              setImageGenState({ styleRefs: [...(imageGen.styleRefs || []), ...newFiles] });
              addLog('SUCCESS', `Added ${newFiles.length} Style Refs`);
          } else if (target === 'base') {
              setBaseImage(newFiles[0]);
              addLog('SUCCESS', `Base Plate secured for re-imagining.`);
          }
      }
  };

  const removeFile = (idx: number, target: 'character' | 'style' | 'base') => {
      if (target === 'character') {
          const newRefs = [...(imageGen.characterRefs || [])];
          newRefs.splice(idx, 1);
          setImageGenState({ characterRefs: newRefs });
      } else if (target === 'style') {
          const newRefs = [...(imageGen.styleRefs || [])];
          newRefs.splice(idx, 1);
          setImageGenState({ styleRefs: newRefs });
      } else if (target === 'base') {
          setBaseImage(null);
          setVisionAnalysis(null);
      }
  };

  const handleVisionScan = async () => {
      if (!baseImage) return;
      setIsAnalyzing(true);
      try {
          const analysis = await analyzeImageVision(baseImage);
          setVisionAnalysis(analysis);
          addLog('SUCCESS', 'Vision Scan complete. Matrix metadata extracted.');
      } catch (e: any) {
          addLog('ERROR', `Vision scan failed: ${e.message}`);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleDownloadAll = async () => {
        const zip = new JSZip();
        let count = 0;
        frames.forEach((f, i) => {
            if (f.imageUrl) {
                // Remove data:image/png;base64, header
                const data = f.imageUrl.split(',')[1];
                const ext = f.imageUrl.substring("data:image/".length, f.imageUrl.indexOf(";base64"));
                zip.file(`frame_${(i + 1).toString().padStart(2, '0')}.${ext}`, data, {base64: true});
                count++;
            }
        });
        
        if (count === 0) {
            addLog('WARN', 'No generated frames to download.');
            return;
        }
        
        try {
            const content = await zip.generateAsync({type:"blob"});
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `storyboard_sequence_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addLog('SUCCESS', `Downloaded ${count} frames as ZIP.`);
        } catch (e) {
            addLog('ERROR', 'Failed to zip files.');
        }
    };

  // --- Storyboard Logic ---

  const generatePlan = async () => {
      if (!imageGen.prompt) return;
      setIsPlanning(true);
      try {
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (!hasKey) await promptSelectKey();

          // Use the FIRST style ref as the visual anchor for planning, or generic
          const context = {
              prompt: imageGen.prompt,
              style: imageGen.activeStylePreset,
              file: imageGen.styleRefs?.[0] || null,
              ertData: imageGen.resonanceCurve
          };

          // Generate plan based on current frame count
          const plan = await generateStoryboardPlan(context, frames.length);
          
          // Map plan to frames
          const newFrames = frames.map((f, i) => {
              if (plan[i]) {
                  return { 
                      ...f, 
                      scenePrompt: plan[i].scenePrompt, 
                      continuity: plan[i].continuity,
                      camera: plan[i].camera,
                      lighting: plan[i].lighting,
                      audio_cue: plan[i].audio_cue
                  };
              }
              return f;
          });
          
          setFrames(newFrames);
          addLog('SUCCESS', 'Storyboard Plan Generated with Cinematic Metadata');
      } catch (err: any) {
          addLog('ERROR', `Planning Failed: ${err.message}`);
      } finally {
          setIsPlanning(false);
      }
  };

  const generateFrame = async (index: number, forceHighQuality = false) => {
      let currentPrompt = '';
      let currentCamera = '';
      let currentLighting = '';
      let shouldProceed = false;
      
      setFrames(prev => {
          const f = prev[index];
          if (f && f.scenePrompt && f.scenePrompt.trim() !== '') {
              shouldProceed = true;
              currentPrompt = f.scenePrompt;
              currentCamera = f.camera || '';
              currentLighting = f.lighting || '';
              
              const newFrames = [...prev];
              newFrames[index] = { ...f, status: 'generating', error: undefined };
              return newFrames;
          }
          return prev;
      });

      if (!shouldProceed) return;

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const isDraft = draftMode && !forceHighQuality;
          const model = isDraft ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
          
          const ertFrame = imageGen.resonanceCurve[index] || { tension: 50, dynamics: 50 };

          const finalPrompt = await constructCinematicPrompt(
              currentPrompt,
              imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY,
              (imageGen.styleRefs && imageGen.styleRefs.length > 0),
              ertFrame,
              imageGen.activeStylePreset,
              currentCamera,
              currentLighting
          );

          setActiveFramePrompt(finalPrompt);

          const parts: any[] = [];
          if (imageGen.characterRefs) parts.push(...imageGen.characterRefs);
          if (imageGen.styleRefs) parts.push(...imageGen.styleRefs);
          parts.push({ text: finalPrompt });

          const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
              model,
              contents: { parts },
              config: {
                  imageConfig: {
                      aspectRatio: imageGen.aspectRatio,
                      ...( !isDraft ? { imageSize: '4K' } : {} )
                  }
              }
          }));

          let url = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  const mimeType = part.inlineData.mimeType || 'image/png';
                  url = `data:${mimeType};base64,${part.inlineData.data}`;
                  break;
              }
          }

          if (url) {
              setFrames(prev => prev.map((f, i) => i === index ? { ...f, imageUrl: url, status: 'done', isDraft: isDraft } : f));
          } else {
              throw new Error("No image generated");
          }

      } catch (err: any) {
          setFrames(prev => prev.map((f, i) => i === index ? { ...f, status: 'error', error: err.message } : f));
          addLog('ERROR', `Frame ${index + 1} Failed: ${err.message}`);
      }
  };

  const handleBatchRender = async () => {
      const activeIndices = frames.map((f, i) => f.scenePrompt && f.scenePrompt.trim() !== '' ? i : -1).filter(i => i !== -1);
      
      if (activeIndices.length === 0) {
          addLog('WARN', 'No frames with prompts to render.');
          return;
      }

      setIsBatchRendering(true);
      setBatchProgress({ current: 0, total: activeIndices.length });

      for (const i of activeIndices) {
          await generateFrame(i);
          setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
          await new Promise(r => setTimeout(r, 500));
      }
      
      setIsBatchRendering(false);
      addLog('SUCCESS', 'Batch Render Complete');
  };

  // --- Single Image Logic ---
  const generateSingleImage = async () => {
      if (!imageGen.prompt?.trim() && !baseImage) return;
      setImageGenState({ isLoading: true, error: null });
      setShowPromptInspector(false);
      
      try {
          const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setImageGenState({ isLoading: false }); return; }

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const isDraft = draftMode;
          const model = isDraft ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

          const finalPrompt = await constructCinematicPrompt(
              imageGen.prompt || "Improve and re-imagine the provided image source.", 
              imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
              (imageGen.styleRefs && imageGen.styleRefs.length > 0),
              undefined,
              imageGen.activeStylePreset
          );
          
          setActiveFramePrompt(finalPrompt);

          const parts: any[] = [];
          // Image-to-Image / Editing: Base image goes first
          if (baseImage) parts.push(baseImage);
          if (imageGen.characterRefs) parts.push(...imageGen.characterRefs);
          if (imageGen.styleRefs) parts.push(...imageGen.styleRefs);
          parts.push({ text: finalPrompt });

          const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
              model,
              contents: { parts },
              config: {
                  imageConfig: {
                      aspectRatio: imageGen.aspectRatio,
                      ...( !isDraft ? { imageSize: '4K' } : {} )
                  }
              }
          }));

          let url = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  const mimeType = part.inlineData.mimeType || 'image/png';
                  url = `data:${mimeType};base64,${part.inlineData.data}`;
                  break;
              }
          }

          if (url) {
              setImageGenState({ 
                  generatedImage: { 
                      url, 
                      prompt: finalPrompt,
                      aspectRatio: imageGen.aspectRatio, 
                      size: isDraft ? 'Flash Native' : '4K' 
                  },
                  isLoading: false 
              });
              addLog('SUCCESS', `Cinematic Asset Fabricated (${isDraft ? 'Draft' : '4K Pro'})`);
          } else {
              throw new Error("No image data returned from model.");
          }

      } catch (err: any) {
          console.error("Generation Error:", err);
          setImageGenState({ error: err.message, isLoading: false });
          addLog('ERROR', `Generation Failed: ${err.message}`);
      }
  };

  useVoiceAction('generate_render', 'Generate single asset based on current prompt', generateSingleImage);
  useVoiceAction('toggle_quality', 'Toggle between Draft and 4K Pro mode', () => setDraftMode(prev => !prev));

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl relative font-sans">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        {/* Header */}
        <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#d946ef]/10 border border-[#d946ef] rounded">
                    <ImageIcon className="w-4 h-4 text-[#d946ef]" />
                </div>
                <div>
                    <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Cinematic Asset Studio</h1>
                    <p className="text-[9px] text-gray-500 font-mono">Neural Fabrication Engine v2.2</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333]">
                <button onClick={() => setActiveTab('SINGLE')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'SINGLE' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}>
                    <Wand2 className="w-3 h-3" /> Single Asset
                </button>
                <button onClick={() => setActiveTab('STORYBOARD')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'STORYBOARD' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}>
                    <Clapperboard className="w-3 h-3" /> Storyboard
                </button>
                <button onClick={() => setActiveTab('TEASER')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'TEASER' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}>
                    <Video className="w-3 h-3" /> Genesis Teaser
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative z-10 p-6">
            
            {activeTab === 'SINGLE' && (
                <div className="h-full flex gap-6">
                    {/* Controls Sidebar (Fixed Layout) */}
                    <div className="w-[400px] flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full overflow-hidden shadow-2xl relative">
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-[#333] pb-2 mb-2">
                                    <Film className="w-3 h-3 text-[#9d4edd]" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Production Bible</span>
                                </div>

                                <MultiReferenceSlot 
                                    label="Base Plate (Source)" 
                                    icon={ImageIcon} 
                                    files={baseImage ? [baseImage] : []} 
                                    onRemove={() => setBaseImage(null)}
                                    onUpload={(e) => handleUpload(e, 'base')}
                                    accept="image/*"
                                />

                                <MultiReferenceSlot 
                                    label="Lead Actor Lock" 
                                    icon={User} 
                                    files={imageGen.characterRefs || []} 
                                    onRemove={(idx) => removeFile(idx, 'character')}
                                    onUpload={(e) => handleUpload(e, 'character')}
                                    accept="image/*,application/pdf"
                                />

                                <MultiReferenceSlot 
                                    label="Style Reference" 
                                    icon={Palette} 
                                    files={imageGen.styleRefs || []} 
                                    onRemove={(idx) => removeFile(idx, 'style')}
                                    onUpload={(e) => handleUpload(e, 'style')}
                                    accept="image/*,application/pdf"
                                />

                                <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#222] hover:border-[#333] transition-colors">
                                    <label className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider mb-2 block font-bold">Style Preset</label>
                                    <select 
                                        value={imageGen.activeStylePreset}
                                        onChange={(e) => setImageGenState({ activeStylePreset: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] p-2.5 text-xs font-mono text-gray-300 outline-none focus:border-[#d946ef] rounded-lg mb-2 cursor-pointer transition-colors hover:bg-[#111]"
                                    >
                                        {STYLE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-gray-500 font-mono italic px-1">
                                        {STYLE_PRESETS.find(p => p.id === imageGen.activeStylePreset)?.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[#333]">
                                <div className="flex-1 flex flex-col">
                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-2 font-bold flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-[#22d3ee]" /> {baseImage ? 'Re-imagining Directive' : 'Scene Directive'}
                                    </label>
                                    <textarea 
                                        value={imageGen.prompt || ''}
                                        onChange={(e) => setImageGenState({ prompt: e.target.value })}
                                        className="flex-1 w-full bg-[#0f0f0f] border border-[#333] p-4 text-xs font-mono text-white outline-none focus:border-[#d946ef] rounded-xl resize-none min-h-[120px] shadow-inner placeholder:text-gray-700"
                                        placeholder={baseImage ? "E.g. Transform this into a moody cyber-noir scene..." : "E.g. A solitary hacker standing in the rain..."}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-2 font-bold">Aspect Ratio</label>
                                        <select 
                                            value={imageGen.aspectRatio}
                                            onChange={(e) => setImageGenState({ aspectRatio: e.target.value as any })}
                                            className="w-full bg-[#0f0f0f] border border-[#333] p-2.5 text-xs font-mono text-gray-300 outline-none focus:border-[#d946ef] rounded-lg cursor-pointer"
                                        >
                                            {Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-2 font-bold">Render Quality</label>
                                        <button 
                                            onClick={() => setDraftMode(!draftMode)}
                                            className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all ${draftMode ? 'bg-[#111] border-[#333] text-gray-400' : 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd] shadow-[0_0_10px_rgba(157,78,221,0.2)]'}`}
                                        >
                                            <span>{draftMode ? 'DRAFT' : '4K PRO'}</span>
                                            {draftMode ? <ToggleLeft className="w-4 h-4"/> : <ToggleRight className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[#222] bg-[#0a0a0a] relative z-20 flex flex-col gap-2">
                            {baseImage && (
                                <button 
                                    onClick={handleVisionScan}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-[#111] border border-[#333] hover:border-[#22d3ee] text-gray-300 hover:text-[#22d3ee] font-bold text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Scan className="w-3.5 h-3.5"/>}
                                    Vision Scan Source
                                </button>
                            )}
                            <button 
                                onClick={generateSingleImage}
                                disabled={imageGen.isLoading || (!imageGen.prompt?.trim() && !baseImage)}
                                className="w-full py-4 bg-[#d946ef] text-black font-bold text-xs uppercase tracking-[0.2em] font-mono rounded-lg hover:bg-[#f0abfc] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(217,70,239,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {imageGen.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                                {imageGen.isLoading ? 'FABRICATING...' : 'GENERATE ASSET'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-[#050505] border border-[#222] rounded-lg relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

                        {imageGen.generatedImage ? (
                            <>
                                <div className="relative flex-1 flex items-center justify-center p-8 z-10">
                                    <div className="relative group">
                                        <img 
                                            src={imageGen.generatedImage.url} 
                                            className="max-w-full max-h-[80vh] object-contain shadow-2xl border border-[#333] rounded-sm" 
                                            alt="Generated" 
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 opacity-0 group-hover:opacity-100 transition-opacity border-t border-[#333]">
                                            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                                                <span>{imageGen.generatedImage.size} • {imageGen.generatedImage.aspectRatio}</span>
                                                <span className="text-[#9d4edd]">GENERATED_ASSET</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-8 flex gap-3 z-20">
                                        <button 
                                            onClick={() => setShowPromptInspector(!showPromptInspector)} 
                                            className="px-5 py-2.5 bg-black/80 backdrop-blur text-white text-xs font-mono uppercase rounded-full border border-[#333] hover:bg-[#1f1f1f] hover:border-white transition-all flex items-center gap-2 shadow-lg"
                                        >
                                            <Eye className="w-3 h-3" /> Inspect Matrix
                                        </button>
                                        <a href={imageGen.generatedImage.url} download={`generated-asset-${Date.now()}.png`} className="px-5 py-2.5 bg-[#d946ef] text-black text-xs font-mono uppercase rounded-full border border-[#d946ef] hover:bg-[#f0abfc] flex items-center gap-2 font-bold shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:scale-105 transition-all">
                                            <Download className="w-3 h-3" /> Save Asset
                                        </a>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 z-10 pointer-events-none">
                                <div className="w-32 h-32 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Film className="w-12 h-12 text-gray-600" />
                                </div>
                                <p className="text-sm font-mono uppercase tracking-[0.2em] text-gray-500 font-bold">Visual Output Offline</p>
                                <p className="text-xs font-mono text-gray-700 mt-2">Initialize fabrication sequence...</p>
                            </div>
                        )}
                        
                        {visionAnalysis && (
                            <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-md border border-[#9d4edd]/30 p-4 rounded-xl z-30 shadow-2xl animate-in slide-in-from-right-4 duration-500 max-h-[80%] overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-[#9d4edd] font-mono text-[10px] font-bold uppercase tracking-widest">
                                        <Zap className="w-3.5 h-3.5"/> Vision Matrix Data
                                    </div>
                                    <button onClick={() => setVisionAnalysis(null)} className="text-gray-500 hover:text-white"><X size={12}/></button>
                                </div>
                                <div className="text-[10px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {visionAnalysis}
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {showPromptInspector && (
                                <motion.div 
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#333] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col z-30"
                                >
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#333]">
                                        <div className="flex items-center gap-2 text-[#d946ef]">
                                            <Zap className="w-4 h-4" />
                                            <span className="text-xs font-bold font-mono uppercase tracking-widest">Holo Deep Scan // Prompt Matrix</span>
                                        </div>
                                        <button onClick={() => setShowPromptInspector(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap p-4 bg-[#000] border border-[#222] rounded-lg border-l-4 border-l-[#9d4edd]">
                                        {imageGen.generatedImage?.prompt}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {imageGen.error && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-6 py-3 rounded-full text-xs font-mono border border-red-500 flex items-center gap-3 z-30 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                <AlertCircle className="w-4 h-4" /> {imageGen.error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Storyboard Tab */}
            {activeTab === 'STORYBOARD' && (
                <div className="h-full flex gap-6">
                    <div className="w-[400px] flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full overflow-hidden shadow-2xl relative">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            <div className="pb-4 border-b border-[#222]">
                                <h3 className="text-xs font-bold text-[#9d4edd] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Film className="w-4 h-4" /> Narrative Architecture
                                </h3>
                                <textarea 
                                    value={imageGen.prompt || ''}
                                    onChange={(e) => setImageGenState({ prompt: e.target.value })}
                                    className="w-full bg-[#0f0f0f] border border-[#333] p-4 text-xs text-gray-300 rounded-xl resize-none h-40 outline-none focus:border-[#9d4edd] font-mono shadow-inner leading-relaxed"
                                    placeholder="NARRATIVE SEED: A rogue android fleeing through a neon-lit alleyway in Neo-Tokyo. It carries a glowing data core. Security drones pursue from above."
                                />
                            </div>

                            <div className="space-y-4">
                                <MultiReferenceSlot 
                                    label="Lead Actor Lock" 
                                    icon={User} 
                                    files={imageGen.characterRefs || []} 
                                    onRemove={(idx) => removeFile(idx, 'character')}
                                    onUpload={(e) => handleUpload(e, 'character')}
                                    accept="image/*,application/pdf"
                                />
                                <MultiReferenceSlot 
                                    label="Style Reference" 
                                    icon={Palette} 
                                    files={imageGen.styleRefs || []} 
                                    onRemove={(idx) => removeFile(idx, 'style')}
                                    onUpload={(e) => handleUpload(e, 'style')}
                                    accept="image/*,application/pdf"
                                />
                                <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#222]">
                                    <label className="text-[9px] font-mono text-[#9d4edd] uppercase tracking-wider mb-2 block font-bold">Style Preset</label>
                                    <select 
                                        value={imageGen.activeStylePreset}
                                        onChange={(e) => setImageGenState({ activeStylePreset: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] p-2.5 text-xs font-mono text-gray-300 outline-none focus:border-[#d946ef] rounded-lg mb-2 cursor-pointer transition-colors"
                                    >
                                        {STYLE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#222]">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block font-bold">Render Quality</label>
                                        <span className={`text-[9px] font-mono ${draftMode ? 'text-gray-400' : 'text-[#9d4edd]'}`}>
                                            {draftMode ? 'DRAFT (FAST)' : '4K PRO'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setDraftMode(!draftMode)}
                                        className={`w-full py-2 rounded-lg border text-xs font-mono uppercase transition-all ${draftMode ? 'bg-[#111] border-[#333] text-gray-400' : 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd] font-bold shadow-lg'}`}
                                    >
                                        {draftMode ? 'Draft Mode Enabled' : 'Pro Mode Active'}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <button onClick={() => setShowERT(!showERT)} className="w-full flex justify-between items-center text-[10px] font-mono uppercase text-gray-500 mb-2 hover:text-white">
                                    <span>Emotional Resonance (eRP)</span>
                                    <Activity className="w-3 h-3" />
                                </button>
                                <AnimatePresence>
                                    {showERT && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <EmotionalResonanceGraph />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[#222] bg-[#0a0a0a] space-y-3 relative z-20">
                            <div className="flex gap-2 items-center text-[9px] font-mono text-gray-500 justify-between">
                                <span className="uppercase tracking-widest font-bold">Frame Count</span>
                                <input 
                                    type="number" 
                                    min="3" max="20" 
                                    value={frames.length} 
                                    onChange={(e) => setFrames(Array.from({ length: Math.max(1, parseInt(e.target.value)) }, (_, i) => ({ index: i, scenePrompt: '', continuity: '', status: 'pending' })))} 
                                    className="w-16 bg-[#111] border border-[#333] rounded px-2 py-1 text-center text-white focus:border-[#9d4edd] outline-none"
                                />
                            </div>
                            <button 
                                onClick={generatePlan}
                                disabled={isPlanning || !imageGen.prompt}
                                className="w-full py-3 bg-[#1f1f1f] text-[#9d4edd] font-bold text-[10px] uppercase tracking-widest font-mono rounded-lg hover:bg-[#333] border border-[#333] hover:border-[#9d4edd] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isPlanning ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                                Generate Plan
                            </button>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={handleBatchRender}
                                    disabled={isBatchRendering || frames.every(f => !f.scenePrompt)}
                                    className="w-full py-4 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-[0.2em] font-mono rounded-lg hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:scale-[1.02]"
                                >
                                    {isBatchRendering ? <Loader2 className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3"/>}
                                    Render
                                </button>
                                
                                {isBatchRendering && (
                                    <div className="w-full bg-[#1f1f1f] rounded-full h-1.5 mt-1 overflow-hidden relative">
                                        <div 
                                            className="bg-[#9d4edd] h-full transition-all duration-300 relative" 
                                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                        >
                                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleDownloadAll}
                                    disabled={frames.every(f => !f.imageUrl)}
                                    className="w-full py-2 bg-[#1f1f1f] border border-[#333] hover:border-[#9d4edd] hover:text-[#9d4edd] text-gray-400 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    title="Download All Frames as ZIP"
                                >
                                    <Package className="w-3 h-3" />
                                    <span className="text-[9px] font-mono font-bold uppercase">Download All</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg overflow-y-auto custom-scrollbar p-8 relative">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.01)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none"></div>
                        
                        <div className="space-y-8 max-w-5xl mx-auto">
                            {frames.map((frame, idx) => (
                                <div key={idx} className="flex gap-6 relative">
                                    {idx !== frames.length - 1 && (
                                        <div className="absolute left-[8.5rem] top-32 bottom-[-2rem] w-px bg-gradient-to-b from-[#333] to-transparent border-r border-dashed border-[#444]"></div>
                                    )}
                                    <div className="w-8 flex flex-col items-center pt-8 opacity-50 font-mono text-xs text-gray-500">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex-1 bg-[#0e0e0e] p-6 rounded-xl border border-[#222] group hover:border-[#9d4edd]/50 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] flex gap-6">
                                        <div className="w-72 aspect-video bg-black border border-[#333] rounded-lg flex items-center justify-center relative overflow-hidden shrink-0 group/img">
                                            {frame.imageUrl ? (
                                                <>
                                                    <img 
                                                        src={frame.imageUrl} 
                                                        alt={`Frame ${idx + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" 
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button onClick={() => { setActiveFramePrompt(frame.scenePrompt); setShowPromptInspector(true); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white backdrop-blur">
                                                            <Eye className="w-4 h-4"/>
                                                        </button>
                                                        <a href={frame.imageUrl} download={`frame-${idx + 1}.png`} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white backdrop-blur">
                                                            <Download className="w-4 h-4"/>
                                                        </a>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center">
                                                    {frame.status === 'generating' ? (
                                                        <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin mx-auto" />
                                                    ) : (
                                                        <Film className="w-8 h-8 text-gray-700 mx-auto" />
                                                    )}
                                                </div>
                                            )}
                                            {frame.status === 'generating' && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center" />}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                                            <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider font-bold">SEQ_{idx.toString().padStart(3, '0')}</span>
                                                    {frame.status === 'done' && frame.isDraft && (
                                                        <span className="text-[8px] font-mono text-gray-500 border border-gray-700 px-1.5 rounded uppercase bg-[#111]">Draft</span>
                                                    )}
                                                    {frame.status === 'done' && !frame.isDraft && (
                                                        <span className="text-[8px] font-mono text-[#42be65] border border-[#42be65]/30 px-1.5 rounded uppercase bg-[#42be65]/10">4K Pro</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => generateFrame(idx)}
                                                        disabled={frame.status === 'generating' || !frame.scenePrompt}
                                                        className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-mono uppercase transition-all disabled:opacity-50 flex items-center gap-1.5 font-bold"
                                                    >
                                                        <Wand2 className="w-3 h-3" /> {frame.status === 'done' ? 'Re-Roll' : 'Render Frame'}
                                                    </button>
                                                    {frame.status === 'done' && frame.isDraft && (
                                                        <button 
                                                            onClick={() => generateFrame(idx, true)}
                                                            disabled={isBatchRendering}
                                                            className="px-3 py-1.5 bg-[#9d4edd]/10 hover:bg-[#9d4edd] hover:text-black border border-[#9d4edd]/50 rounded text-[9px] font-mono uppercase transition-all disabled:opacity-50 flex items-center gap-1.5 text-[#9d4edd] font-bold"
                                                        >
                                                            <Maximize className="w-3 h-3" /> Upscale 4K
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {(frame.camera || frame.lighting) && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {frame.camera && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1f1f1f] rounded border border-[#333] text-[9px] font-mono text-gray-400">
                                                            <Camera className="w-3 h-3 text-[#22d3ee]" /> {frame.camera}
                                                        </div>
                                                    )}
                                                    {frame.lighting && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1f1f1f] rounded border border-[#333] text-[9px] font-mono text-gray-400">
                                                            <Sun className="w-3 h-3 text-[#f59e0b]" /> {frame.lighting}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <label className="text-[9px] text-gray-500 uppercase block mb-1 font-bold">Visual Directive</label>
                                                <textarea 
                                                    value={frame.scenePrompt}
                                                    onChange={(e) => {
                                                        const newFrames = [...frames];
                                                        newFrames[idx].scenePrompt = e.target.value;
                                                        setFrames(newFrames);
                                                    }}
                                                    className="w-full h-20 bg-[#050505] border border-[#333] rounded-lg p-3 text-[11px] font-mono text-gray-300 resize-none outline-none focus:border-[#9d4edd] leading-relaxed transition-colors"
                                                    placeholder="Frame description..."
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="text-[9px] text-gray-500 uppercase block mb-1 font-bold">Continuity Notes</label>
                                                <input 
                                                    type="text" 
                                                    value={frame.continuity}
                                                    onChange={(e) => {
                                                        const newFrames = [...frames];
                                                        newFrames[idx].continuity = e.target.value;
                                                        setFrames(newFrames);
                                                    }}
                                                    className="w-full bg-[#050505] border border-[#333] rounded-lg p-2.5 text-[10px] font-mono text-gray-400 outline-none focus:border-[#9d4edd] transition-colors"
                                                    placeholder="Lighting/Angle notes..."
                                                />
                                            </div>
                                            {frame.error && <p className="text-[9px] text-red-500 font-mono mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {frame.error}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TEASER TAB CONTENT */}
            {activeTab === 'TEASER' && (
                <div className="h-full w-full relative bg-black overflow-hidden rounded-lg shadow-2xl border border-[#333]">
                    <GenesisTeaser frames={frames} />
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageGen;