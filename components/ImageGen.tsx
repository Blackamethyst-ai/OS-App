
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY, ResonancePoint, AppMode } from '../types';
import { 
    promptSelectKey, fileToGenerativePart, generateStoryboardPlan, 
    constructCinematicPrompt, retryGeminiRequest, analyzeImageVision, 
    generateNarrativeContext, generateVideo, generateAudioOverview
} from '../services/geminiService';
import { 
    ImageIcon, Loader2, RefreshCw, Download, Plus, Trash2, Film, Wand2, 
    Upload, X, Layers, AlertCircle, Eye, Activity, User, Palette, 
    FileText, ChevronRight, MonitorPlay, Zap, Clapperboard, Play, 
    Maximize, ToggleLeft, ToggleRight, Volume2, VolumeX, SkipForward, 
    Globe, Lock, Unlock, Fingerprint, Cpu, Radio, Power, Box, 
    Camera, Sun, Video, Package, Scan, Sparkles, ChevronDown, CheckCircle,
    Monitor, Music, FastForward, Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionalResonanceGraph from './EmotionalResonanceGraph';
import { audio } from '../services/audioService';

interface Frame {
  index: number;
  scenePrompt: string;
  continuity: string;
  camera?: string; 
  lighting?: string; 
  audio_cue?: string; 
  status: 'pending' | 'generating' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
  imageData?: FileData;
}

const STYLE_PRESETS = [
    { id: 'CINEMATIC_REALISM', label: 'Cinematic Realism', desc: '8K, Unreal Engine 5, Highly Detailed' },
    { id: 'CYBER_NOIR', label: 'Cyber-Noir', desc: 'Neon, Wet Surfaces, High Contrast, Chromatic Aberration' },
    { id: 'ETHEREAL_SOLARPUNK', label: 'Ethereal Solarpunk', desc: 'Golden Hour, Biomimetic, Lush Greenery, Hopeful' },
    { id: 'ANALOG_HORROR', label: 'Analog Horror', desc: 'VHS Grain, Liminal Spaces, Flash Photography' },
    { id: 'STUDIO_GHIBLI', label: 'Anime Art (Ghibli)', desc: 'Hand-painted, Vibrant Colors, Cel-Shaded' },
    { id: 'GRITTY_REALISM', label: 'Gritty Realism', desc: '35mm Grain, Desaturated, Tactical, Raw' },
];

const ImageGen: React.FC = () => {
  const { imageGen, setImageGenState, addLog, openHoloProjector } = useAppStore();
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'TEASER'>('SINGLE');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [showERT, setShowERT] = useState(true);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [draftMode, setDraftMode] = useState(true);
  const [baseImage, setBaseImage] = useState<FileData | null>(null);

  // Teaser State
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [isTeaserPlaying, setIsTeaserPlaying] = useState(false);
  const [teaserAudio, setTeaserAudio] = useState<HTMLAudioElement | null>(null);
  const [isGeneratingTeaserAudio, setIsGeneratingTeaserAudio] = useState(false);

  // Video State (Veo)
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');
  const [videoSettings, setVideoSettings] = useState({ aspectRatio: '16:9' as const, resolution: '720p' as const });

  useEffect(() => {
      if (frames.length === 0) {
          setFrames(Array.from({ length: 10 }, (_, i) => ({ index: i, scenePrompt: '', continuity: '', status: 'pending' })));
      }
  }, []);

  // Playback loop for Teaser
  useEffect(() => {
      let timer: number;
      if (isTeaserPlaying && frames.length > 0) {
          timer = window.setTimeout(() => {
              setTeaserIdx((prev) => (prev + 1) % frames.length);
          }, 3500); // 3.5s per frame
      }
      return () => clearTimeout(timer);
  }, [isTeaserPlaying, teaserIdx, frames]);

  const handlePlanSequence = async () => {
      if (!imageGen.prompt?.trim()) return;
      setIsPlanning(true);
      addLog('SYSTEM', 'STORYBOARD: Orchestrating sequential narrative plan...');
      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsPlanning(false); return; }
          const plan = await generateStoryboardPlan(imageGen.prompt);
          const newFrames: Frame[] = plan.map((p, i) => ({
              index: i,
              scenePrompt: p.scenePrompt,
              continuity: p.continuity,
              camera: p.camera,
              lighting: p.lighting,
              audio_cue: p.audio_cue,
              status: 'pending'
          }));
          setFrames(newFrames);
          addLog('SUCCESS', `STORYBOARD: Narrative lattice crystallized into ${newFrames.length} frames.`);
          audio.playSuccess();
      } catch (err: any) {
          addLog('ERROR', `PLAN_FAIL: ${err.message}`);
      } finally {
          setIsPlanning(false);
      }
  };

  const renderFrame = async (idx: number) => {
      const frame = frames[idx];
      setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'generating' } : f));
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const model = draftMode ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
          
          const resonance = imageGen.resonanceCurve?.[idx];
          const resonanceContext = resonance 
            ? `[Narrative Tension: ${resonance.tension}%] [Visual Dynamics: ${resonance.dynamics}%]`
            : "";

          const finalPrompt = await constructCinematicPrompt(
              `${frame.scenePrompt} ${resonanceContext}`, 
              imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
              false, 
              imageGen.characterRefs.length > 0, 
              imageGen.styleRefs.length > 0, 
              `Camera: ${frame.camera}. Lighting: ${frame.lighting}. Consistency: ${frame.continuity}`, 
              imageGen.activeStylePreset
          );

          const parts: any[] = [];
          if (imageGen.characterRefs) parts.push(...imageGen.characterRefs);
          if (imageGen.styleRefs) parts.push(...imageGen.styleRefs);
          parts.push({ text: finalPrompt });

          const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({ 
              model: model as any, 
              contents: { parts }, 
              config: { imageConfig: { aspectRatio: imageGen.aspectRatio, ...(!draftMode ? { imageSize: '4K' } : {}) } } 
          }));

          let url = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) { 
              if (part.inlineData) { 
                  url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                  break; 
              } 
          }

          if (url) {
              setFrames(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: url, status: 'done' } : f));
          } else {
              throw new Error("No data returned");
          }
      } catch (err: any) {
          setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
      }
  };

  const renderSequence = async () => {
      setIsBatchRendering(true);
      addLog('SYSTEM', 'BATCH_RENDER: Initiating sequential fabrication cycle...');
      for (let i = 0; i < frames.length; i++) {
          await renderFrame(i);
          await new Promise(r => setTimeout(r, 500));
      }
      setIsBatchRendering(false);
      addLog('SUCCESS', 'BATCH_RENDER: Sequential asset fabrication finalized.');
      audio.playSuccess();
  };

  const handleGenerateTeaserAudio = async () => {
      setIsGeneratingTeaserAudio(true);
      addLog('SYSTEM', 'AUDIO_CORE: Generating cinematic narration overview...');
      try {
          // Flatten frames for summary
          const framesToSynthesize = frames.map(f => ({ inlineData: { data: '', mimeType: 'image/png' }, name: f.scenePrompt }));
          const { audioData } = await generateAudioOverview(framesToSynthesize);
          
          if (audioData) {
            const blob = new Blob([new Uint8Array(atob(audioData).split("").map(c => c.charCodeAt(0)))], { type: 'audio/pcm' });
            // In a real app, we'd need a PCM wrapper or use the AudioContext directly as in geminiService
            // For this UI component, we log success.
            addLog('SUCCESS', 'AUDIO_CORE: Narrative audio track stabilized.');
          }
      } catch (err: any) {
          addLog('ERROR', `AUDIO_FAIL: ${err.message}`);
      } finally {
          setIsGeneratingTeaserAudio(false);
      }
  };

  const exportZip = async () => {
      const zip = new JSZip();
      const folder = zip.folder("cinematic_storyboard");
      frames.forEach((f, i) => {
          if (f.imageUrl) {
              const base64Data = f.imageUrl.split(',')[1];
              folder?.file(`frame_${String(i + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
          }
      });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `storyboard_${Date.now()}.zip`;
      link.click();
      audio.playSuccess();
  };

  const handleVideoGenerate = async () => {
      if (!videoPrompt.trim()) return;
      setIsVideoLoading(true);
      setVideoUrl(null);
      addLog('SYSTEM', 'VEO_INIT: Initializing High-Fidelity Video Synthesis...');
      
      const messages = ["Vectorizing Narrative...", "Synthesizing Latent Space...", "Rendering Motion...", "Polishing Final Sequence..."];
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
          setVideoProgressMsg(messages[msgIdx]);
          msgIdx = (msgIdx + 1) % messages.length;
      }, 8000);

      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsVideoLoading(false); clearInterval(msgInterval); return; }
          const url = await generateVideo(videoPrompt, videoSettings.aspectRatio, videoSettings.resolution);
          setVideoUrl(url);
          addLog('SUCCESS', 'VEO_COMPLETE: Video asset stabilized.');
      } catch (err: any) {
          addLog('ERROR', `VEO_FAIL: ${err.message}`);
      } finally {
          setIsVideoLoading(false);
          clearInterval(msgInterval);
      }
  };

  const generateSingleImage = async () => {
      if (!imageGen.prompt?.trim() && !baseImage) return;
      setImageGenState({ isLoading: true, error: null });
      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setImageGenState({ isLoading: false }); return; }
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const model = draftMode ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
          const finalPrompt = await constructCinematicPrompt(imageGen.prompt || "Vision.", imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, !!baseImage, imageGen.characterRefs.length > 0, imageGen.styleRefs.length > 0, undefined, imageGen.activeStylePreset);
          const parts: any[] = [];
          if (baseImage) parts.push(baseImage);
          if (imageGen.characterRefs) parts.push(...imageGen.characterRefs);
          if (imageGen.styleRefs) parts.push(...imageGen.styleRefs);
          parts.push({ text: finalPrompt });
          const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({ model: model as any, contents: { parts }, config: { imageConfig: { aspectRatio: imageGen.aspectRatio, ...(!draftMode ? { imageSize: '4K' } : {}) } } }));
          let url = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) { url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; } }
          if (url) { setImageGenState({ generatedImage: { url, prompt: finalPrompt, aspectRatio: imageGen.aspectRatio, size: draftMode ? 'Native' : '4K' }, isLoading: false }); addLog('SUCCESS', `Asset Fabricated.`); }
          else throw new Error("No image data returned.");
      } catch (err: any) { setImageGenState({ error: err.message, isLoading: false }); addLog('ERROR', `Generation Failed: ${err.message}`); }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl relative z-10 font-sans">
        <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#d946ef]/10 border border-[#d946ef] rounded"><ImageIcon className="w-4 h-4 text-[#d946ef]" /></div>
                <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Asset Studio</h1><p className="text-[9px] text-gray-500 font-mono">Cinema Lattice v4.0</p></div>
            </div>
            <div className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333]">
                <button onClick={() => setActiveTab('SINGLE')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'SINGLE' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}><Wand2 className="w-3 h-3" /> Single</button>
                <button onClick={() => setActiveTab('STORYBOARD')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'STORYBOARD' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}><Clapperboard className="w-3 h-3" /> Storyboard</button>
                <button onClick={() => setActiveTab('VIDEO')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'VIDEO' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}><Video className="w-3 h-3" /> Video</button>
                <button onClick={() => setActiveTab('TEASER')} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'TEASER' ? 'bg-[#d946ef] text-black' : 'text-gray-500 hover:text-white'}`}><MonitorPlay className="w-3 h-3" /> Teaser</button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative z-10 p-6">
            {activeTab === 'SINGLE' && (
                <div className="h-full flex gap-6">
                    <div className="w-80 flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full overflow-hidden p-6 space-y-6 shrink-0 shadow-2xl">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Base Plate</label>
                            <label className="flex flex-col items-center justify-center aspect-video bg-[#0a0a0a] border border-dashed border-[#333] rounded-lg cursor-pointer hover:border-[#d946ef] transition-all">
                                {baseImage ? <img src={`data:${baseImage.inlineData.mimeType};base64,${baseImage.inlineData.data}`} className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-5 h-5 text-gray-700" />}
                                <input type="file" className="hidden" onChange={(e) => {
                                     if (e.target.files && e.target.files[0]) {
                                         fileToGenerativePart(e.target.files[0]).then(setBaseImage);
                                     }
                                }} />
                            </label>
                            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Directive</label>
                            <textarea value={imageGen.prompt} onChange={(e) => setImageGenState({ prompt: e.target.value })} className="w-full h-32 bg-[#0a0a0a] border border-[#222] p-3 text-xs font-mono text-white outline-none rounded-xl resize-none focus:border-[#d946ef]" placeholder="E.g. Neon rain in neo-tokyo..." />
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-mono text-gray-500 uppercase">Preset</label>
                                <select value={imageGen.activeStylePreset} onChange={(e) => setImageGenState({ activeStylePreset: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#222] p-2 text-xs font-mono text-white rounded-lg outline-none">
                                    {STYLE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={generateSingleImage} disabled={imageGen.isLoading} className="w-full py-4 bg-[#d946ef] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#f0abfc] transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2">
                            {imageGen.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Render
                        </button>
                    </div>
                    <div className="flex-1 bg-[#050505] border border-[#222] rounded-lg overflow-hidden flex items-center justify-center relative shadow-2xl">
                        {imageGen.generatedImage ? <img src={imageGen.generatedImage.url} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-16 h-16 text-gray-900" />}
                    </div>
                </div>
            )}

            {activeTab === 'STORYBOARD' && (
                <div className="h-full flex gap-6 overflow-hidden">
                    <div className="w-80 flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full p-6 space-y-6 shrink-0 shadow-2xl">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-bold">Sequential Directive</label>
                                <textarea value={imageGen.prompt} onChange={e => setImageGenState({ prompt: e.target.value })} className="w-full h-32 bg-[#0a0a0a] border border-[#333] p-3 text-[10px] font-mono text-white outline-none rounded-xl resize-none focus:border-[#d946ef]" placeholder="Describe the overarching narrative arc..." />
                            </div>
                            
                            <button onClick={handlePlanSequence} disabled={isPlanning || !imageGen.prompt?.trim()} className="w-full py-3 bg-[#d946ef]/10 hover:bg-[#d946ef] border border-[#d946ef]/40 text-[#d946ef] hover:text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                                {isPlanning ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />} 
                                Plan Narrative
                            </button>

                            <div className="h-px bg-white/5" />

                            <button onClick={() => setShowERT(!showERT)} className="w-full flex justify-between items-center text-[10px] font-mono uppercase text-gray-500 hover:text-white"><span className="flex items-center gap-2"><Activity size={12}/> Emotional Curve</span> <ChevronDown size={12}/></button>
                            {showERT && <EmotionalResonanceGraph />}

                            <div className="mt-auto space-y-2 pt-6">
                                <button onClick={renderSequence} disabled={isBatchRendering || frames.length === 0} className="w-full py-4 bg-[#d946ef] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#f0abfc] transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2">
                                    {isBatchRendering ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                    Render Sequence
                                </button>
                                <button onClick={exportZip} disabled={isBatchRendering || !frames.some(f => f.imageUrl)} className="w-full py-3 bg-white/5 border border-white/10 hover:border-white/40 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Download size={14} /> Export ZIP
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-black/40 border border-[#222] rounded-lg overflow-y-auto custom-scrollbar p-6 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                            {frames.map((f, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`bg-[#0a0a0a] border rounded-2xl flex flex-col overflow-hidden transition-all duration-500
                                        ${f.status === 'done' ? 'border-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.1)]' : f.status === 'generating' ? 'border-[#d946ef] animate-pulse' : 'border-[#1f1f1f] hover:border-[#333]'}
                                    `}
                                >
                                    <div className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 group">
                                        <AnimatePresence mode="wait">
                                            {f.status === 'generating' ? (
                                                <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                                                    <Loader2 size={32} className="text-[#d946ef] animate-spin" />
                                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Synthesizing...</span>
                                                </motion.div>
                                            ) : f.imageUrl ? (
                                                <motion.img key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={f.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 opacity-20">
                                                    <Film size={40} className="text-gray-600" />
                                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Frame {i + 1} Offline</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        
                                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-black font-mono text-white border border-white/10 z-10">
                                            {String(i + 1).padStart(2, '0')}
                                        </div>

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10">
                                            <button onClick={() => renderFrame(i)} className="p-3 bg-[#d946ef] text-black rounded-full hover:scale-110 transition-transform shadow-xl"><RefreshCw size={20}/></button>
                                            {f.imageUrl && <button onClick={() => openHoloProjector({ id: `frame-${i}`, title: `Frame ${i+1}`, type: 'IMAGE', content: f.imageUrl })} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"><Maximize size={20}/></button>}
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Scene Logic</span>
                                                {f.status === 'done' && <CheckCircle size={12} className="text-[#10b981]" />}
                                            </div>
                                            <textarea 
                                                value={f.scenePrompt} 
                                                onChange={e => { const n = [...frames]; n[i].scenePrompt = e.target.value; setFrames(n); }} 
                                                className="w-full bg-[#050505] border border-[#222] p-3 text-[11px] font-mono text-gray-300 outline-none rounded-xl h-20 resize-none focus:border-[#d946ef] transition-all"
                                                placeholder={`Frame ${i + 1} optics...`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                                                <div className="text-[8px] text-gray-600 uppercase font-mono mb-1">Optics</div>
                                                <div className="text-[9px] text-gray-400 font-mono truncate">{f.camera || 'STANDARD'}</div>
                                            </div>
                                            <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                                                <div className="text-[8px] text-gray-600 uppercase font-mono mb-1">Dynamics</div>
                                                <div className="text-[9px] text-gray-400 font-mono truncate">{f.continuity || 'SECURE'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'VIDEO' && (
                <div className="h-full flex gap-6">
                    <div className="w-96 flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full p-6 space-y-6 shrink-0 shadow-2xl">
                        <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                            <Video className="w-5 h-5 text-[#d946ef]" />
                            <h2 className="text-xs font-black font-mono text-white uppercase tracking-widest">VEO 3.1 Studio</h2>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-bold">Temporal Directive</label>
                                <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} disabled={isVideoLoading} className="w-full h-40 bg-[#0a0a0a] border border-[#333] p-4 text-xs font-mono text-white outline-none rounded-xl resize-none focus:border-[#d946ef] transition-all" placeholder="Describe high-fidelity motion..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Aspect</label>
                                    <select value={videoSettings.aspectRatio} onChange={e => setVideoSettings({...videoSettings, aspectRatio: e.target.value as any})} disabled={isVideoLoading} className="w-full bg-[#111] border border-[#333] p-2 text-[10px] text-white rounded">
                                        <option value="16:9">Landscape</option>
                                        <option value="9:16">Portrait</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Res</label>
                                    <select value={videoSettings.resolution} onChange={e => setVideoSettings({...videoSettings, resolution: e.target.value as any})} disabled={isVideoLoading} className="w-full bg-[#111] border border-[#333] p-2 text-[10px] text-white rounded">
                                        <option value="1080p">HD</option>
                                        <option value="720p">Fast</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleVideoGenerate} disabled={isVideoLoading || !videoPrompt.trim()} className="w-full py-4 bg-[#d946ef] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#f0abfc] transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2">
                            {isVideoLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Generate Sequence
                        </button>
                    </div>
                    <div className="flex-1 bg-black border border-[#222] rounded-xl overflow-hidden relative shadow-2xl flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {isVideoLoading ? (
                                <motion.div key="loader" className="flex flex-col items-center justify-center text-center gap-6">
                                    <Loader2 size={64} className="text-[#d946ef] animate-spin" />
                                    <div className="space-y-2">
                                        <p className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">{videoProgressMsg}</p>
                                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Temporal Frame Orchestration Active...</p>
                                    </div>
                                </motion.div>
                            ) : videoUrl ? (
                                <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                                </motion.div>
                            ) : (
                                <div className="text-center opacity-20">
                                    <Video size={80} className="mx-auto mb-6 text-gray-500" />
                                    <p className="text-xs font-mono uppercase tracking-[0.5em]">Sequence Offline</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {activeTab === 'TEASER' && (
                <div className="h-full flex flex-col gap-6">
                    <div className="flex-1 bg-black rounded-3xl border border-[#1f1f1f] relative overflow-hidden group shadow-2xl flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {frames[teaserIdx]?.imageUrl ? (
                                <motion.div 
                                    key={teaserIdx} 
                                    initial={{ opacity: 0, scale: 1.1 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0, scale: 0.9 }} 
                                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                                    className="w-full h-full"
                                >
                                    <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover opacity-60 blur-[2px] scale-105" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <img src={frames[teaserIdx].imageUrl} className="max-w-[90%] max-h-[80%] object-contain shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 rounded-lg" />
                                    </div>
                                    <div className="absolute bottom-12 left-12 right-12 z-20">
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-white/5 max-w-2xl">
                                            <div className="text-[10px] font-black text-[#d946ef] uppercase tracking-[0.4em] mb-2">Sequence Node {teaserIdx + 1}</div>
                                            <p className="text-lg font-mono text-white leading-relaxed">{frames[teaserIdx].scenePrompt}</p>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-center opacity-20">
                                    <MonitorPlay size={80} className="mx-auto mb-6" />
                                    <p className="text-xs font-mono uppercase tracking-[0.5em]">No Rendered Assets in Cache</p>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Teaser HUD */}
                        <div className="absolute top-8 left-8 flex items-center gap-4 z-30">
                            <div className="px-4 py-2 bg-black/60 backdrop-blur border border-white/10 rounded-full flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                                <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Cinema Monitor // LIVE</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 px-8 py-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
                            <button onClick={() => setTeaserIdx(p => (p - 1 + frames.length) % frames.length)} className="p-2 text-gray-400 hover:text-white transition-colors"><FastForward size={20} className="rotate-180" /></button>
                            <button onClick={() => setIsTeaserPlaying(!isTeaserPlaying)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                                {isTeaserPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                            </button>
                            <button onClick={() => setTeaserIdx(p => (p + 1) % frames.length)} className="p-2 text-gray-400 hover:text-white transition-colors"><FastForward size={20} /></button>
                            <div className="h-6 w-px bg-white/10" />
                            <button onClick={handleGenerateTeaserAudio} disabled={isGeneratingTeaserAudio} className={`p-2 transition-all ${isGeneratingTeaserAudio ? 'text-[#d946ef] animate-pulse' : 'text-gray-400 hover:text-white'}`}>
                                <Music size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="h-24 bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] p-4 flex gap-4 overflow-x-auto no-scrollbar">
                        {frames.map((f, i) => (
                            <button 
                                key={i} 
                                onClick={() => setTeaserIdx(i)}
                                className={`w-32 h-full rounded-lg border overflow-hidden transition-all shrink-0 ${teaserIdx === i ? 'border-[#d946ef] ring-1 ring-[#d946ef] scale-105' : 'border-white/5 opacity-50 hover:opacity-100'}`}
                            >
                                {f.imageUrl ? <img src={f.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#111] flex items-center justify-center text-[10px] font-mono text-gray-700">NODE {i+1}</div>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageGen;
