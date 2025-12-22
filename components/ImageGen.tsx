import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY, ResonancePoint } from '../types';
import { promptSelectKey, fileToGenerativePart, generateStoryboardPlan, constructCinematicPrompt, retryGeminiRequest, analyzeImageVision, generateNarrativeContext, generateVideo } from '../services/geminiService';
import { Image as ImageIcon, Loader2, RefreshCw, Download, Plus, Trash2, Film, Wand2, Upload, X, Layers, AlertCircle, Eye, Activity, User, Palette, FileText, ChevronRight, MonitorPlay, Zap, Clapperboard, Play, Maximize, ToggleLeft, ToggleRight, Volume2, VolumeX, SkipForward, Globe, Lock, Unlock, Fingerprint, Cpu, Radio, Power, Box, Camera, Sun, Video, Package, Scan, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionalResonanceGraph from './EmotionalResonanceGraph';
import { useVoiceAction } from '../hooks/useVoiceAction';

// Storyboard Frame Interface
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

const ImageGen: React.FC = () => {
  const { imageGen, setImageGenState, addLog } = useAppStore();
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'TEASER'>('SINGLE');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [showERT, setShowERT] = useState(true);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [draftMode, setDraftMode] = useState(true);
  const [baseImage, setBaseImage] = useState<FileData | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Video State
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

  const handleVideoGenerate = async () => {
      if (!videoPrompt.trim()) return;
      setIsVideoLoading(true);
      setVideoUrl(null);
      addLog('SYSTEM', 'VEO_INIT: Initializing High-Fidelity Video Synthesis...');
      
      const messages = [
          "Vectorizing Narrative Prompt...",
          "Synthesizing Temporal Latent Space...",
          "Rendering Motion Vectors...",
          "Harmonizing Frame Consistency...",
          "Polishing Final Sequence...",
          "Establishing Secure Download Handshake..."
      ];
      
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
          setVideoProgressMsg(messages[msgIdx]);
          msgIdx = (msgIdx + 1) % messages.length;
      }, 8000);

      try {
          if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsVideoLoading(false); clearInterval(msgInterval); return; }
          const url = await generateVideo(videoPrompt, videoSettings.aspectRatio, videoSettings.resolution);
          setVideoUrl(url);
          addLog('SUCCESS', 'VEO_COMPLETE: Video asset stabilized and ready for playback.');
      } catch (err: any) {
          addLog('ERROR', `VEO_FAIL: ${err.message}`);
      } finally {
          setIsVideoLoading(false);
          clearInterval(msgInterval);
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'character' | 'style' | 'base') => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles: FileData[] = [];
          for (let i = 0; i < e.target.files.length; i++) {
              try {
                  const file = e.target.files[i];
                  const data = await fileToGenerativePart(file);
                  newFiles.push(data);
              } catch (err) {
                  addLog('ERROR', `Failed to upload ${e.target.files[i].name}`);
              }
          }
          if (target === 'character') setImageGenState({ characterRefs: [...(imageGen.characterRefs || []), ...newFiles] });
          else if (target === 'style') setImageGenState({ styleRefs: [...(imageGen.styleRefs || []), ...newFiles] });
          else if (target === 'base') setBaseImage(newFiles[0]);
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
        <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#d946ef]/10 border border-[#d946ef] rounded"><ImageIcon className="w-4 h-4 text-[#d946ef]" /></div>
                <div><h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Cinematic Asset Studio</h1><p className="text-[9px] text-gray-500 font-mono">Unified Composite Engine v3.1</p></div>
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
                                {baseImage ? <img src={`data:${baseImage.inlineData.mimeType};base64,${baseImage.inlineData.data}`} className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-gray-700" />}
                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'base')} />
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
                        {imageGen.generatedImage ? <img src={imageGen.generatedImage.url} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-16 h-16 text-gray-800" />}
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
                                <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} disabled={isVideoLoading} className="w-full h-40 bg-[#0a0a0a] border border-[#333] p-4 text-xs font-mono text-white outline-none rounded-xl resize-none focus:border-[#d946ef] transition-all" placeholder="Describe a cinematic sequence with high motion fidelity..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Aspect</label>
                                    <select value={videoSettings.aspectRatio} onChange={e => setVideoSettings({...videoSettings, aspectRatio: e.target.value as any})} disabled={isVideoLoading} className="w-full bg-[#111] border border-[#333] p-2 text-[10px] text-white rounded">
                                        <option value="16:9">Landscape (16:9)</option>
                                        <option value="9:16">Portrait (9:16)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Res</label>
                                    <select value={videoSettings.resolution} onChange={e => setVideoSettings({...videoSettings, resolution: e.target.value as any})} disabled={isVideoLoading} className="w-full bg-[#111] border border-[#333] p-2 text-[10px] text-white rounded">
                                        <option value="1080p">HD (1080p)</option>
                                        <option value="720p">Fast (720p)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleVideoGenerate} disabled={isVideoLoading || !videoPrompt.trim()} className="w-full py-4 bg-[#d946ef] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#f0abfc] transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2">
                            {isVideoLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {isVideoLoading ? 'Synthesizing...' : 'Generate Sequence'}
                        </button>
                    </div>
                    <div className="flex-1 bg-black border border-[#222] rounded-xl overflow-hidden relative shadow-2xl flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {isVideoLoading ? (
                                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center gap-6">
                                    <div className="relative">
                                        <Loader2 size={64} className="text-[#d946ef] animate-spin" />
                                        <div className="absolute inset-0 bg-[#d946ef]/20 blur-[30px] rounded-full animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">{videoProgressMsg}</p>
                                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">VEO Engine is orchestrating temporal frames... This may take ~2-3 minutes.</p>
                                    </div>
                                </motion.div>
                            ) : videoUrl ? (
                                <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                                    <div className="absolute bottom-6 right-6">
                                        <a href={videoUrl} download="veo_sequence.mp4" className="p-3 bg-[#d946ef] text-black rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-black text-[10px] uppercase">
                                            <Download size={18} /> Export MP4
                                        </a>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-center opacity-20">
                                    <Video size={80} className="mx-auto mb-6 text-gray-500" />
                                    <p className="text-xs font-mono uppercase tracking-[0.5em]">Sequence Hub Offline</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {activeTab === 'STORYBOARD' && (
                <div className="h-full flex gap-6 overflow-hidden">
                    <div className="w-80 flex flex-col bg-[#050505] border border-[#222] rounded-lg h-full p-6 space-y-6 shrink-0 shadow-2xl">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            <button onClick={() => setShowERT(!showERT)} className="w-full flex justify-between items-center text-[10px] font-mono uppercase text-gray-500 hover:text-white"><span className="flex items-center gap-2"><Activity size={12}/> Emotional Curve</span> <ChevronDown size={12}/></button>
                            {showERT && <EmotionalResonanceGraph />}
                        </div>
                    </div>
                    <div className="flex-1 bg-black/40 border border-[#222] rounded-lg overflow-y-auto custom-scrollbar p-6 grid grid-cols-2 gap-6 shadow-inner">
                        {frames.map((f, i) => (
                            <div key={i} className="bg-[#0a0a0a] border border-[#222] p-4 rounded-xl flex flex-col gap-3 group hover:border-[#d946ef]/40 transition-colors">
                                <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center border border-white/5">
                                    {f.imageUrl ? <img src={f.imageUrl} className="w-full h-full object-cover" /> : <Film size={32} className="text-gray-900" />}
                                </div>
                                <textarea value={f.scenePrompt} onChange={e => { const n = [...frames]; n[i].scenePrompt = e.target.value; setFrames(n); }} className="bg-black border border-[#222] p-2 text-[10px] font-mono text-gray-300 outline-none rounded-lg h-20 resize-none focus:border-[#d946ef]" placeholder={`Frame ${i+1} directive...`} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageGen;