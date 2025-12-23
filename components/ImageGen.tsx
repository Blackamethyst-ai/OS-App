import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import JSZip from 'jszip';
import { useAppStore } from '../store';
import { AspectRatio, ImageSize, FileData, SOVEREIGN_DEFAULT_COLORWAY } from '../types';
import { 
    promptSelectKey, fileToGenerativePart, generateStoryboardPlan, 
    constructCinematicPrompt, retryGeminiRequest, 
    generateAudioOverview
} from '../services/geminiService';
import { 
    ImageIcon, Loader2, RefreshCw, Download, Plus, Film, Wand2, 
    Upload, X, Layers, Activity, Zap, Clapperboard, Play, 
    Maximize, Volume2, VolumeX, FastForward, Pause, Sliders, Layout,
    Video, Sparkles, ChevronDown, CheckCircle, Monitor, Info, Target,
    Eye, Camera, Sun, Focus, Move, Settings, UserCircle, Map as MapIcon, Palette,
    ArrowRight, Box, ShieldCheck, Binary, Ghost
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
  status: 'pending' | 'generating' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
}

interface ThematicManifest {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
}

const MetadataTag = ({ label, value, color = "#9d4edd" }: { label: string, value: string, color?: string }) => (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
    </div>
);

const ImageGen: React.FC = () => {
  const { imageGen, setImageGenState, addLog, openHoloProjector } = useAppStore();
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'TEASER'>('SINGLE');
  
  // Advanced State
  const [characterRef, setCharacterRef] = useState<FileData | null>(null);
  const [settingRef, setSettingRef] = useState<FileData | null>(null);
  const [styleRef, setStyleRef] = useState<FileData | null>(null);
  const [thematicManifest, setThematicManifest] = useState<ThematicManifest | null>(null);
  const [isScanningRefs, setIsScanningRefs] = useState(false);

  // Storyboard State
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  // Teaser/Theatre State
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [isTeaserPlaying, setIsTeaserPlaying] = useState(false);
  const [isGeneratingTeaserAudio, setIsGeneratingTeaserAudio] = useState(false);
  const [teaserAudioUrl, setTeaserAudioUrl] = useState<string | null>(null);

  // Video State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoRes, setVideoRes] = useState<'720p' | '1080p'>('1080p');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');

  const checkApiKey = async () => {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
          await promptSelectKey();
          return false;
      }
      return true;
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const data = await fileToGenerativePart(file);
        if (type === 'CHAR') setCharacterRef(data);
        if (type === 'SET') setSettingRef(data);
        if (type === 'STYLE') setStyleRef(data);
        audio.playClick();
    }
  };

  const analyzeThematicContext = async () => {
      if (!characterRef && !settingRef && !styleRef) return;
      setIsScanningRefs(true);
      addLog('SYSTEM', 'LATTICE_SCAN: Deep parsing reference vectors for thematic coherence...');
      
      try {
          if (!(await checkApiKey())) { setIsScanningRefs(false); return; }
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const parts: any[] = [];
          if (characterRef) parts.push(characterRef);
          if (settingRef) parts.push(settingRef);
          if (styleRef) parts.push(styleRef);
          parts.push({ text: "Analyze these 3 images (Character, Setting, Style) and synthesize a unified Thematic Manifest. Return JSON {theme, atmosphere, visualLogic, narrativeArc}." });

          const response = await retryGeminiRequest(() => ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: { parts },
              config: { 
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          theme: { type: Type.STRING },
                          atmosphere: { type: Type.STRING },
                          visualLogic: { type: Type.STRING },
                          narrativeArc: { type: Type.STRING }
                      },
                      required: ['theme', 'atmosphere', 'visualLogic', 'narrativeArc']
                  }
              }
          }));

          const manifest = JSON.parse(response.text || '{}');
          setThematicManifest(manifest);
          addLog('SUCCESS', 'LATTICE_SCAN: Thematic Signature captured. Identity persistence active.');
          audio.playSuccess();
      } catch (err: any) {
          addLog('ERROR', `SCAN_FAIL: ${err.message}`);
      } finally {
          setIsScanningRefs(false);
      }
  };

  const generateSingleImage = async () => {
      if (!imageGen.prompt?.trim() && !characterRef) return;
      if (!(await checkApiKey())) return;

      setImageGenState({ isLoading: true, error: null });
      audio.playClick();

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const usePro = imageGen.quality !== ImageSize.SIZE_1K;
          const model = usePro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
          
          const contextualPrompt = thematicManifest 
            ? `THEME: ${thematicManifest.theme}. STYLE: ${thematicManifest.visualLogic}. PROMPT: ${imageGen.prompt}`
            : imageGen.prompt;

          const finalPrompt = await constructCinematicPrompt(
              contextualPrompt || "A cinematic masterpiece.", 
              imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
              !!characterRef, 
              !!characterRef, 
              !!styleRef, 
              thematicManifest?.atmosphere, 
              imageGen.activeStylePreset
          );

          const parts: any[] = [];
          if (characterRef) parts.push({ ...characterRef, text: "Reference: Main Character Identity" });
          if (settingRef) parts.push({ ...settingRef, text: "Reference: Setting/Environment" });
          if (styleRef) parts.push({ ...styleRef, text: "Reference: Artistic Style" });
          parts.push({ text: finalPrompt });

          const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({ 
              model: model as any, 
              contents: { parts }, 
              config: { 
                  imageConfig: { 
                      aspectRatio: imageGen.aspectRatio, 
                      imageSize: imageGen.quality as any
                  } 
              } 
          }));

          let url = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) { 
              if (part.inlineData) { 
                  url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                  break; 
              } 
          }

          if (url) { 
              setImageGenState({ generatedImage: { url, prompt: finalPrompt, aspectRatio: imageGen.aspectRatio, size: imageGen.quality }, isLoading: false }); 
              addLog('SUCCESS', `ASSET_STUDIO: Neural fabrication stable.`); 
              audio.playSuccess();
          } else {
              throw new Error("Empty response from latent core.");
          }
      } catch (err: any) { 
          setImageGenState({ error: err.message, isLoading: false }); 
          addLog('ERROR', `FABRICATION_FAIL: ${err.message}`); 
          audio.playError();
      }
  };

  const handlePlanSequence = async () => {
    if (!imageGen.prompt?.trim() && !thematicManifest) return;
    setIsPlanning(true);
    addLog('SYSTEM', 'STORYBOARD: Designing sequential narrative arc...');
    try {
        if (!(await checkApiKey())) { setIsPlanning(false); return; }
        
        const contextualGoal = thematicManifest 
            ? `THEME: ${thematicManifest.theme}. ARC: ${thematicManifest.narrativeArc}. USER_PROMPT: ${imageGen.prompt}`
            : imageGen.prompt;

        const plan = await generateStoryboardPlan(contextualGoal);
        setFrames(plan.map((p, i) => ({
            index: i,
            scenePrompt: p.scenePrompt,
            continuity: p.continuity,
            camera: p.camera,
            lighting: p.lighting,
            status: 'pending'
        })));
        addLog('SUCCESS', `STORYBOARD: Narrative digitized across ${plan.length} nodes.`);
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
        const usePro = imageGen.quality !== ImageSize.SIZE_1K;
        const model = usePro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
        
        const resonance = imageGen.resonanceCurve?.[idx];
        const resonanceContext = resonance 
          ? `[Intensity: ${resonance.tension}%] [Dynamic_Range: ${resonance.dynamics}%]`
          : "";

        const promptContext = thematicManifest 
            ? `THEME: ${thematicManifest.theme}. STYLE: ${thematicManifest.visualLogic}.`
            : "";

        const finalPrompt = await constructCinematicPrompt(
            `${promptContext} SCENE: ${frame.scenePrompt} ${resonanceContext}`, 
            imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
            !!characterRef, 
            !!characterRef, 
            !!styleRef, 
            `Cam: ${frame.camera}. Lite: ${frame.lighting}.`, 
            imageGen.activeStylePreset
        );

        const parts: any[] = [];
        if (characterRef) parts.push(characterRef);
        if (styleRef) parts.push(styleRef);
        parts.push({ text: finalPrompt });

        const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({ 
            model: model as any, 
            contents: { parts }, 
            config: { imageConfig: { aspectRatio: imageGen.aspectRatio, imageSize: imageGen.quality as any } } 
        }));

        let url = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) { 
            if (part.inlineData) { url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; } 
        }

        if (url) {
            setFrames(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: url, status: 'done' } : f));
        } else {
            throw new Error("Latent failure");
        }
    } catch (err: any) {
        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
    }
  };

  const renderSequence = async () => {
    setIsBatchRendering(true);
    addLog('SYSTEM', 'BATCH_RENDER: Initiating total sequence fabrication...');
    for (let i = 0; i < frames.length; i++) {
        if (frames[i].status === 'done') continue;
        await renderFrame(i);
        await new Promise(r => setTimeout(r, 1200)); // Pacing for SDK reliability
    }
    setIsBatchRendering(false);
    addLog('SUCCESS', 'BATCH_RENDER: Sequence Secured.');
    audio.playSuccess();
  };

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) return;
    if (!(await checkApiKey())) return;

    setIsVideoLoading(true);
    setVideoUrl(null);
    setVideoProgressMsg("Priming VEO-3.1 Temporal Lattice...");
    addLog('SYSTEM', 'VEO_INIT: Forging motion sequence...');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: videoPrompt,
            config: {
                numberOfVideos: 1,
                resolution: videoRes as any,
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            setVideoProgressMsg(`Inverting latent space vectors... [${Math.floor(Math.random() * 30 + 40)}%]`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        addLog('SUCCESS', 'VEO_COMPLETE: Temporal sequence stabilized.');
        audio.playSuccess();
    } catch (err: any) {
        addLog('ERROR', `VEO_FAIL: ${err.message}`);
        audio.playError();
    } finally {
        setIsVideoLoading(false);
    }
  };

  const exportZip = async () => {
    if (frames.filter(f => f.imageUrl).length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("fabricated_assets");
    
    addLog('SYSTEM', 'EXPORT: Compiling node package...');
    
    for (const frame of frames) {
      if (frame.imageUrl) {
        try {
          const response = await fetch(frame.imageUrl);
          const blob = await response.blob();
          folder?.file(`node_${frame.index + 1}.png`, blob);
        } catch (e) {
          console.error(`Failed to fetch node ${frame.index}`, e);
        }
      }
    }
    
    if (thematicManifest) {
        folder?.file("thematic_manifest.json", JSON.stringify(thematicManifest, null, 2));
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `sequence_${Date.now()}.zip`;
    link.click();
    addLog('SUCCESS', 'EXPORT: Node package encrypted and downloaded.');
    audio.playSuccess();
  };

  const handleGenerateTeaserAudio = async () => {
    const currentFrame = frames[teaserIdx];
    if (!currentFrame || !currentFrame.scenePrompt) return;
    
    setIsGeneratingTeaserAudio(true);
    setTeaserAudioUrl(null);
    addLog('SYSTEM', 'AUDIO_GEN: Synthesizing narrative overview...');
    
    try {
      if (!(await checkApiKey())) { setIsGeneratingTeaserAudio(false); return; }
      const narrativeText = thematicManifest 
        ? `In a world defined by ${thematicManifest.theme}, ${currentFrame.scenePrompt}`
        : currentFrame.scenePrompt;

      const { audioData } = await generateAudioOverview([{ 
          inlineData: { data: '', mimeType: 'text/plain' }, 
          name: narrativeText 
      }]);
      
      if (audioData) {
        setTeaserAudioUrl(`data:audio/pcm;base64,${audioData}`);
        addLog('SUCCESS', 'AUDIO_GEN: Narrative waveform stabilized.');
        audio.playSuccess();
      }
    } catch (err: any) {
      addLog('ERROR', `AUDIO_FAIL: ${err.message}`);
    } finally {
      setIsGeneratingTeaserAudio(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative z-10 font-sans group/studio">
        
        {/* Cinematic Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-50 bg-[length:100%_4px] opacity-20" />

        {/* Global Studio Header */}
        <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-2xl z-[60] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/40 to-transparent" />
            
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <ImageIcon className="w-5 h-5 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Asset Studio</h1>
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Prime Evolution // v7.0</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-white/5" />
                <div className="flex items-center gap-1 bg-[#050505] p-1.5 rounded-2xl border border-white/5">
                    {[
                        { id: 'SINGLE', label: 'Forge', icon: Wand2 },
                        { id: 'STORYBOARD', label: 'Narrative', icon: Clapperboard },
                        { id: 'VIDEO', label: 'VEO.Motion', icon: Video },
                        { id: 'TEASER', label: 'Theatre', icon: Monitor }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); audio.playClick(); }}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all
                                ${activeTab === tab.id ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/30' : 'text-gray-500 hover:text-gray-300'}
                            `}
                        >
                            <tab.icon size={14} className={activeTab === tab.id ? 'fill-current' : ''} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Active Model</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#22d3ee] uppercase">
                            {imageGen.quality === ImageSize.SIZE_1K ? 'FLASH_v2.5' : 'PRO_v3.0'}
                        </span>
                        <div className="flex gap-0.5">
                            {[1,1,1].map((v, i) => <div key={i} className={`w-1 h-3 rounded-full ${v ? 'bg-[#10b981]' : 'bg-[#222]'}`} />)}
                        </div>
                    </div>
                </div>
                <button onClick={() => {}} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all">
                    <Settings size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative z-10">
            <AnimatePresence mode="wait">
                {activeTab === 'SINGLE' && (
                    <motion.div key="single" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex gap-10 p-10">
                        {/* Sidebar Config & References */}
                        <div className="w-[400px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2">
                            
                            {/* Reference Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'CHAR', label: 'Character', icon: UserCircle, state: characterRef, set: setCharacterRef },
                                    { id: 'SET', label: 'Setting', icon: MapIcon, state: settingRef, set: setSettingRef },
                                    { id: 'STYLE', label: 'Style', icon: Palette, state: styleRef, set: setStyleRef }
                                ].map(ref => (
                                    <div key={ref.id} className="relative group/ref aspect-square bg-[#0a0a0a] border border-[#222] rounded-2xl overflow-hidden hover:border-[#9d4edd] transition-all">
                                        {ref.state ? (
                                            <div className="w-full h-full relative">
                                                <img src={`data:${ref.state.inlineData.mimeType};base64,${ref.state.inlineData.data}`} className="w-full h-full object-cover" />
                                                <button onClick={() => ref.set(null)} className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white opacity-0 group-hover/ref:opacity-100 transition-opacity"><X size={12}/></button>
                                            </div>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                                                <ref.icon size={20} className="text-gray-700 mb-2 group-hover/ref:text-[#9d4edd] transition-colors" />
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{ref.label}</span>
                                                <input type="file" className="hidden" onChange={(e) => handleRefUpload(e, ref.id as any)} />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={analyzeThematicContext}
                                disabled={isScanningRefs || (!characterRef && !settingRef && !styleRef)}
                                className={`w-full py-4 border rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3
                                    ${thematicManifest ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}
                                `}
                            >
                                {isScanningRefs ? <Loader2 size={14} className="animate-spin" /> : thematicManifest ? <ShieldCheck size={14}/> : <Binary size={14} />}
                                {thematicManifest ? 'Lattice Synchronized' : 'Thematic Scan'}
                            </button>

                            <AnimatePresence>
                                {thematicManifest && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-5 bg-[#0a0a0a] border border-[#10b981]/20 rounded-2xl space-y-3">
                                        <div className="flex items-center gap-2 text-[#10b981]">
                                            <Ghost size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Thematic Manifest</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-mono italic leading-relaxed">"{thematicManifest.theme}. {thematicManifest.narrativeArc}"</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col gap-4">
                                <span className="text-[10px] font-black text-[#9d4edd] font-mono uppercase tracking-[0.4em] flex items-center gap-2">
                                    <Target size={14} /> Directive Matrix
                                </span>
                                <textarea 
                                    value={imageGen.prompt} 
                                    onChange={e => setImageGenState({ prompt: e.target.value })}
                                    className="w-full h-40 bg-[#0a0a0a] border border-[#222] p-5 rounded-[2rem] text-sm font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover:border-[#333]" 
                                    placeholder="Input core visualization intent..." 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[8px] font-mono text-gray-600 uppercase tracking-widest pl-1">Aspect</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {Object.values(AspectRatio).map(r => (
                                            <button key={r} onClick={() => setImageGenState({ aspectRatio: r })} className={`py-2 rounded-xl text-[9px] font-bold border transition-all ${imageGen.aspectRatio === r ? 'bg-[#9d4edd] border-[#9d4edd] text-black' : 'bg-[#0a0a0a] border-[#222] text-gray-600'}`}>{r}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[8px] font-mono text-gray-600 uppercase tracking-widest pl-1">Tier</label>
                                    <div className="flex flex-col gap-1.5">
                                        {[ImageSize.SIZE_1K, ImageSize.SIZE_2K, ImageSize.SIZE_4K].map(s => (
                                            <button key={s} onClick={() => setImageGenState({ quality: s })} className={`w-full py-2 rounded-xl text-[9px] font-bold border transition-all ${imageGen.quality === s ? 'bg-[#22d3ee] border-[#22d3ee] text-black' : 'bg-[#0a0a0a] border-[#222] text-gray-600'}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={generateSingleImage} 
                                disabled={imageGen.isLoading || (!imageGen.prompt?.trim() && !characterRef)}
                                className="w-full py-5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-xs uppercase tracking-[0.4em] rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(157,78,221,0.4)] flex items-center justify-center gap-4 group/btn active:scale-95 disabled:opacity-50"
                            >
                                {imageGen.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap size={18} />}
                                {imageGen.isLoading ? 'Synthesizing...' : 'Render Asset'}
                            </button>
                        </div>

                        {/* Viewport Area */}
                        <div className="flex-1 flex flex-col gap-6">
                            <div className="flex-1 bg-[#050505] border border-[#1f1f1f] rounded-[3rem] overflow-hidden relative flex items-center justify-center shadow-2xl group/viewport">
                                <AnimatePresence mode="wait">
                                    {imageGen.isLoading ? (
                                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
                                            <div className="relative">
                                                <Loader2 size={64} className="text-[#9d4edd] animate-spin" />
                                                <div className="absolute inset-0 blur-2xl bg-[#9d4edd]/20 animate-pulse" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-[11px] font-black font-mono text-white uppercase tracking-[0.6em]">Inverting latent vectors...</p>
                                                <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Spectral Synthesis Layer Active</p>
                                            </div>
                                        </motion.div>
                                    ) : imageGen.generatedImage ? (
                                        <motion.div key="image" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full p-8 flex items-center justify-center">
                                            <img src={imageGen.generatedImage.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/5" alt="Generated Output" />
                                            
                                            <div className="absolute top-12 left-12 flex flex-col gap-3">
                                                <MetadataTag label="Fabrication Node" value="A100_LATTICE_V7" />
                                                <MetadataTag label="Model ID" value={imageGen.quality === ImageSize.SIZE_1K ? "FLASH_v2.5" : "PRO_v3.0"} color="#22d3ee" />
                                            </div>
                                            <div className="absolute bottom-12 right-12 flex flex-col items-end gap-3">
                                                <div className="px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-3">
                                                    <span className="text-[10px] font-mono text-gray-400 uppercase">RES: {imageGen.quality} // {imageGen.aspectRatio}</span>
                                                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-10 group-hover/viewport:opacity-20 transition-all duration-700 text-center space-y-6">
                                            <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center relative">
                                                <ImageIcon size={64} className="text-gray-500" />
                                                <div className="absolute inset-0 rounded-full border border-[#9d4edd]/20 animate-ping" />
                                            </div>
                                            <p className="text-sm font-mono uppercase tracking-[0.5em]">Viewport Offline</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="h-20 bg-[#0a0a0a]/60 backdrop-blur-xl border border-[#1f1f1f] rounded-[2rem] px-10 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-8">
                                    <button className="flex items-center gap-2.5 text-[10px] font-black font-mono text-gray-500 hover:text-white transition-colors group">
                                        <Eye size={16} /> INSPECT_VECTORS
                                    </button>
                                    <button className="flex items-center gap-2.5 text-[10px] font-black font-mono text-gray-500 hover:text-white transition-colors group">
                                        <Layers size={16} /> LAYER_MAP
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => imageGen.generatedImage && openHoloProjector({ id: 'current', title: 'Fabricated Asset', type: 'IMAGE', content: imageGen.generatedImage.url })} className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-white/40 text-gray-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Fullscreen</button>
                                    <button className="px-6 py-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Download size={14}/> Secure buffer</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'STORYBOARD' && (
                    <motion.div key="storyboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 flex gap-8 p-8 overflow-hidden">
                            <div className="w-[380px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2.5rem] flex flex-col shrink-0 shadow-2xl overflow-hidden">
                                <div className="p-8 border-b border-[#1f1f1f] bg-white/[0.02]">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-[10px] font-black text-[#9d4edd] font-mono uppercase tracking-[0.4em]">Narrative Core</span>
                                        <Clapperboard size={16} className="text-[#9d4edd]" />
                                    </div>
                                    <textarea 
                                        value={imageGen.prompt} 
                                        onChange={e => setImageGenState({ prompt: e.target.value })}
                                        className="w-full h-32 bg-black border border-[#222] p-5 rounded-2xl text-[11px] font-mono text-gray-400 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800"
                                        placeholder="Define the strategic narrative arc..."
                                    />
                                    <button 
                                        onClick={handlePlanSequence} 
                                        disabled={isPlanning || (!imageGen.prompt?.trim() && !thematicManifest)}
                                        className="w-full py-4 mt-6 bg-[#9d4edd]/10 border border-[#9d4edd]/40 text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                                    >
                                        {isPlanning ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                                        Plan Narrative Arc
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                    <div className="space-y-4">
                                        <span className="text-[9px] font-black text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2 px-2"><Activity size={12}/> Emotional Curve</span>
                                        <EmotionalResonanceGraph />
                                    </div>
                                    
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <span className="text-[9px] font-black text-gray-500 font-mono uppercase tracking-widest block pl-2">Fabrication Tier</span>
                                        <div className="flex gap-2">
                                            {[ImageSize.SIZE_1K, ImageSize.SIZE_2K].map(s => (
                                                <button key={s} onClick={() => setImageGenState({ quality: s })} className={`flex-1 py-3 rounded-xl border text-[9px] font-bold uppercase transition-all ${imageGen.quality === s ? 'bg-[#22d3ee] border-[#22d3ee] text-black shadow-lg' : 'bg-black border-[#222] text-gray-600'}`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-[#050505] border-t border-[#1f1f1f] space-y-3">
                                    <button 
                                        onClick={renderSequence} 
                                        disabled={isBatchRendering || frames.length === 0}
                                        className="w-full py-5 bg-[#9d4edd] text-black font-black font-mono text-[10px] uppercase tracking-[0.4em] rounded-2xl hover:bg-[#b06bf7] transition-all shadow-[0_0_40px_rgba(157,78,221,0.2)] flex items-center justify-center gap-3 disabled:opacity-30"
                                    >
                                        {isBatchRendering ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
                                        Render Entire Sequence
                                    </button>
                                    <button onClick={exportZip} className="w-full py-4 bg-white/5 border border-white/10 text-gray-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><Download size={14}/> Export Package (ZIP)</button>
                                </div>
                            </div>

                            <div className="flex-1 bg-black/40 border border-[#1f1f1f] rounded-[2.5rem] overflow-y-auto custom-scrollbar p-10 shadow-inner">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {frames.map((f, i) => (
                                        <motion.div 
                                            key={i} 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`bg-[#0a0a0a] border rounded-[2rem] overflow-hidden transition-all duration-700 relative group
                                                ${f.status === 'done' ? 'border-emerald-500/20' : f.status === 'generating' ? 'border-[#9d4edd] shadow-lg animate-pulse' : 'border-[#1f1f1f] hover:border-[#333]'}
                                            `}
                                        >
                                            <div className="aspect-video bg-black relative overflow-hidden group/frame">
                                                {f.imageUrl ? (
                                                    <img src={f.imageUrl} className="w-full h-full object-cover group-hover/frame:scale-110 transition-transform duration-[4s]" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 gap-4">
                                                        <Film size={48} className="text-gray-500" />
                                                        <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Frame_{String(i+1).padStart(2,'0')} Pending</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-5 left-5 px-3 py-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-black font-mono text-white">NODE_{String(i+1).padStart(2, '0')}</div>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button onClick={() => renderFrame(i)} className="p-3 bg-[#9d4edd] text-black rounded-xl shadow-2xl hover:scale-110 transition-transform"><RefreshCw size={20} /></button>
                                                    {f.imageUrl && <button onClick={() => openHoloProjector({ id: `f-${i}`, title: `Node ${i+1}`, type: 'IMAGE', content: f.imageUrl })} className="p-3 bg-white text-black rounded-xl shadow-2xl hover:scale-110 transition-transform"><Maximize size={20}/></button>}
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <div className="flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                                    <span>Node directive</span>
                                                    {f.status === 'done' && <CheckCircle size={12} className="text-[#10b981]" />}
                                                </div>
                                                <textarea 
                                                    value={f.scenePrompt} 
                                                    onChange={e => { const n = [...frames]; n[i].scenePrompt = e.target.value; setFrames(n); }}
                                                    className="w-full h-20 bg-black/40 border border-white/5 p-4 rounded-xl text-[11px] font-mono text-gray-300 outline-none focus:border-[#9d4edd] transition-all resize-none"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'VIDEO' && (
                    <motion.div key="video" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full flex gap-10 p-10">
                        <div className="w-[380px] flex flex-col gap-6 shrink-0">
                            <div className="p-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2.5rem] flex flex-col gap-6 shadow-2xl">
                                <div className="flex items-center gap-3">
                                    <Video className="w-5 h-5 text-[#d946ef]" />
                                    <h2 className="text-sm font-black font-mono text-white uppercase tracking-[0.4em]">VEO Neural Motion</h2>
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-gray-500 font-mono uppercase tracking-widest pl-2">Temporal Directive</label>
                                    <textarea 
                                        value={videoPrompt} 
                                        onChange={e => setVideoPrompt(e.target.value)}
                                        className="w-full h-48 bg-black border border-[#222] p-5 rounded-[2rem] text-sm font-mono text-gray-300 outline-none focus:border-[#d946ef] resize-none transition-all shadow-inner"
                                        placeholder="Describe cinematic motion sequence..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[8px] font-mono text-gray-600 uppercase tracking-widest pl-1">Resolution</label>
                                        <div className="flex gap-2">
                                            {['720p', '1080p'].map(res => (
                                                <button key={res} onClick={() => setVideoRes(res as any)} className={`flex-1 py-2 rounded-xl border text-[9px] font-bold uppercase transition-all ${videoRes === res ? 'bg-[#d946ef] border-[#d946ef] text-black shadow-lg shadow-[#d946ef]/30' : 'bg-black border-[#222] text-gray-600'}`}>{res}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-right">
                                        <label className="text-[8px] font-mono text-gray-600 uppercase tracking-widest pr-1">Coherence</label>
                                        <div className="h-9 flex items-center justify-end px-3 bg-black border border-white/5 rounded-xl">
                                            <span className="text-[10px] font-mono font-black text-[#10b981]">MAX_STABLE</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleVideoGenerate} 
                                    disabled={isVideoLoading || !videoPrompt.trim()}
                                    className="w-full py-5 bg-[#d946ef] hover:bg-[#f0abfc] text-black font-black font-mono text-xs uppercase tracking-[0.4em] rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(217,70,239,0.4)] flex items-center justify-center gap-4 disabled:opacity-50"
                                >
                                    {isVideoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play size={18} className="fill-current" />}
                                    Forge Temporal Sequence
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-black border border-[#1f1f1f] rounded-[3rem] overflow-hidden relative shadow-2xl flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {isVideoLoading ? (
                                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full border-4 border-t-[#d946ef] border-white/5 animate-spin" />
                                            <div className="absolute inset-0 blur-2xl bg-[#d946ef]/20 animate-pulse" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-lg font-black font-mono text-white uppercase tracking-[0.5em] animate-pulse">{videoProgressMsg}</p>
                                            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Orchestrating coherence matrices...</p>
                                        </div>
                                    </motion.div>
                                ) : videoUrl ? (
                                    <motion.div key="video-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain bg-black" />
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center opacity-10 gap-6">
                                        <Video size={100} className="text-gray-500" />
                                        <p className="text-sm font-mono uppercase tracking-[0.5em]">Sequence Hub Standby</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'TEASER' && (
                    <motion.div key="teaser" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="h-full flex flex-col p-10 gap-8">
                        <div className="flex-1 bg-black rounded-[3rem] border border-[#1f1f1f] relative overflow-hidden group/theatre shadow-[0_50px_150px_rgba(0,0,0,1)] flex items-center justify-center">
                            
                            {/* Ambient Cinematic Glow */}
                            <AnimatePresence mode="wait">
                                {frames[teaserIdx]?.imageUrl && (
                                    <motion.div 
                                        key={`blur-${teaserIdx}`}
                                        initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 1.5 }}
                                        className="absolute inset-0 blur-[120px] scale-125 saturate-200"
                                    >
                                        <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover" alt="" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl z-0" />

                            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-20">
                                <AnimatePresence mode="wait">
                                    {frames[teaserIdx]?.imageUrl ? (
                                        <motion.div 
                                            key={teaserIdx} 
                                            initial={{ opacity: 0, y: 20, scale: 0.98 }} 
                                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                                            exit={{ opacity: 0, y: -20, scale: 1.02 }} 
                                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                            className="relative flex flex-col items-center gap-12 w-full max-w-6xl"
                                        >
                                            <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 relative group/hero">
                                                <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-[12s] ease-linear" alt="Theatre View" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                                                
                                                <div className="absolute top-8 left-8 flex items-center gap-4">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur border border-white/10 rounded-full text-[10px] font-black font-mono text-white">
                                                        <Target size={14} className="text-[#9d4edd]" />
                                                        NODE_SIG_{String(teaserIdx+1).padStart(2,'0')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center space-y-8 max-w-4xl">
                                                <div className="flex justify-center items-center gap-6">
                                                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                    <span className="text-[11px] font-black text-[#9d4edd] uppercase tracking-[0.8em]">Spectral Sequence Active</span>
                                                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                </div>
                                                <p className="text-3xl font-mono text-white leading-relaxed italic drop-shadow-2xl font-medium">
                                                    "{frames[teaserIdx].scenePrompt}"
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-10 gap-6">
                                            <Monitor size={100} className="text-gray-500" />
                                            <p className="text-lg font-mono uppercase tracking-[0.5em]">No Assets in Cache</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Controls HUD */}
                            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-10 px-12 py-6 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] opacity-0 group-hover/theatre:opacity-100 transition-all duration-700 transform translate-y-4 group-hover/theatre:translate-y-0">
                                <div className="flex items-center gap-8">
                                    <button onClick={() => setTeaserIdx(p => (p - 1 + frames.length) % frames.length)} className="p-4 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"><FastForward size={28} className="rotate-180" /></button>
                                    <button 
                                        onClick={() => { setIsTeaserPlaying(!isTeaserPlaying); audio.playClick(); }} 
                                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95
                                            ${isTeaserPlaying ? 'bg-white text-black' : 'bg-[#9d4edd] text-black shadow-[#9d4edd]/40'}
                                        `}
                                    >
                                        {isTeaserPlaying ? <Pause size={40} /> : <Play size={40} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={() => setTeaserIdx(p => (p + 1) % frames.length)} className="p-4 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"><FastForward size={28} /></button>
                                </div>
                                <div className="h-12 w-px bg-white/10" />
                                <div className="flex items-center gap-5">
                                    <button onClick={handleGenerateTeaserAudio} disabled={isGeneratingTeaserAudio} className={`p-5 rounded-2xl transition-all ${isGeneratingTeaserAudio ? 'bg-[#9d4edd] text-black animate-pulse' : 'bg-white/5 text-gray-500 hover:text-[#9d4edd] hover:bg-[#9d4edd]/10'}`}>
                                        <Volume2 size={32} />
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black text-white uppercase tracking-widest leading-none">Theatre HUD</span>
                                        <span className="text-[9px] text-gray-600 font-mono mt-2 uppercase">Uplink: STABLE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Timeline Strip */}
                        <div className="h-32 bg-[#0a0a0a]/40 backdrop-blur-xl rounded-[2rem] border border-[#1f1f1f] p-4 flex gap-5 overflow-x-auto no-scrollbar shadow-2xl shrink-0 group/timeline-strip">
                            {frames.map((f, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => { setTeaserIdx(i); audio.playClick(); }}
                                    className={`relative w-52 h-full rounded-2xl border-2 overflow-hidden transition-all duration-500 shrink-0 group/tn
                                        ${teaserIdx === i ? 'border-[#9d4edd] ring-4 ring-[#9d4edd]/10 scale-105 shadow-2xl z-10' : 'border-transparent opacity-30 hover:opacity-100 hover:border-white/20'}
                                    `}
                                >
                                    {f.imageUrl ? (
                                        <img src={f.imageUrl} className="w-full h-full object-cover group-hover/tn:scale-110 transition-transform duration-1000" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-[#050505] flex items-center justify-center text-[10px] font-mono text-gray-700 uppercase">Node_{i+1}</div>
                                    )}
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded-md text-[7px] font-black font-mono text-white opacity-60 uppercase">F_{i+1}</div>
                                    {teaserIdx === i && <div className="absolute inset-0 bg-[#9d4edd]/5 pointer-events-none" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Studio HUD Footer */}
        <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0 relative z-[60]">
            <div className="flex gap-8 items-center">
                <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest">
                    <CheckCircle size={12} /> Sync_Stable
                </div>
                <div className="flex items-center gap-2 uppercase tracking-widest">
                    <Activity size={12} className="text-[#9d4edd]" /> Latent_Pressure: 0.04mPa
                </div>
                <div className="flex items-center gap-2 uppercase tracking-widest">
                    <Zap size={12} className="text-[#22d3ee]" /> Logic: AUTONOMOUS
                </div>
            </div>
            <div className="flex items-center gap-6">
                <span className="uppercase tracking-[0.4em] opacity-40 leading-none">Architectural Asset Synthesis Engine v7.0</span>
                <div className="h-3 w-px bg-white/10" />
                <span className="font-black text-gray-500 uppercase tracking-widest leading-none">Metaventions_OS</span>
            </div>
        </div>
    </div>
  );
};

export default ImageGen;
