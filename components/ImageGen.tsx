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
    ArrowRight, Box, ShieldCheck, Binary, Ghost, Heart, Award, FileJson, 
    Lightbulb, Timer, Scissors, Music, Aperture, Users, MonitorPlay, Clapperboard as DirectorIcon,
    CheckCircle2, Trash2, Speaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionalResonanceGraph from './EmotionalResonanceGraph';
import { audio } from '../services/audioService';

interface Frame {
  index: number;
  scenePrompt: string;
  continuity: string;
  camera: string; 
  lighting: string; 
  status: 'pending' | 'generating' | 'done' | 'error';
  imageUrl?: string;
  audioUrl?: string;
  error?: string;
}

interface ProductionBible {
    theme: string;
    atmosphere: string;
    visualLogic: string;
    narrativeArc: string;
    opticProfile: string;
    cinematicNotes: string[];
}

const MetadataTag = ({ label, value, color = "#9d4edd" }: { label: string, value: string, color?: string }) => (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-lg group hover:border-white/10 transition-colors shrink-0">
        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black font-mono uppercase truncate" style={{ color }}>{value}</span>
    </div>
);

const CrewSlot = ({ role, status, icon: Icon, color }: { role: string, status: string, icon: any, color: string }) => (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all shrink-0">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[8px] font-mono text-gray-400 uppercase tracking-widest leading-none mb-1">{role}</div>
            <div className="text-[10px] font-black font-mono text-gray-200 uppercase truncate">{status}</div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
    </div>
);

const ImageGen: React.FC = () => {
  const { imageGen, setImageGenState, addLog, openHoloProjector } = useAppStore();
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'STORYBOARD' | 'VIDEO' | 'TEASER'>('SINGLE');
  
  // Cinematic Production State
  const [productionBible, setProductionBible] = useState<ProductionBible | null>(null);
  const [isSynthesizingBible, setIsSynthesizingBible] = useState(false);

  // Storyboard State
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  // Screening Room State
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [isTeaserPlaying, setIsTeaserPlaying] = useState(false);
  const [isGeneratingTeaserAudio, setIsGeneratingTeaserAudio] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

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

  const downloadAsset = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    audio.playSuccess();
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'CHAR' | 'SET' | 'STYLE') => {
    if (e.target.files) {
        const files = Array.from(e.target.files) as File[];
        const dataPromises = files.map(file => fileToGenerativePart(file));
        const newDatas = await Promise.all(dataPromises);
        
        if (type === 'CHAR') setImageGenState({ characterRefs: [...imageGen.characterRefs, ...newDatas] });
        if (type === 'SET') setImageGenState({ worldRefs: [...imageGen.worldRefs, ...newDatas] });
        if (type === 'STYLE') setImageGenState({ styleRefs: [...imageGen.styleRefs, ...newDatas] });
        
        audio.playClick();
        addLog('INFO', `ASSET_LOAD: Added ${newDatas.length} references to ${type} buffer.`);
    }
  };

  const removeRef = (idx: number, type: 'CHAR' | 'SET' | 'STYLE') => {
      if (type === 'CHAR') setImageGenState({ characterRefs: imageGen.characterRefs.filter((_, i) => i !== idx) });
      if (type === 'SET') setImageGenState({ worldRefs: imageGen.worldRefs.filter((_, i) => i !== idx) });
      if (type === 'STYLE') setImageGenState({ styleRefs: imageGen.styleRefs.filter((_, i) => i !== idx) });
  };

  const synthesizeProductionBible = async () => {
      if (imageGen.characterRefs.length === 0 && imageGen.worldRefs.length === 0 && imageGen.styleRefs.length === 0) return;
      setIsSynthesizingBible(true);
      addLog('SYSTEM', 'PRODUCTION_BIBLE: Executing multi-modal scan for cinematic consistency...');
      
      try {
          if (!(await checkApiKey())) { setIsSynthesizingBible(false); return; }
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const parts: any[] = [];
          
          if (imageGen.characterRefs.length > 0) {
              parts.push({ text: "IDENTITY REFERENCE VECTORS:" });
              imageGen.characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
          }
          if (imageGen.worldRefs.length > 0) {
              parts.push({ text: "WORLD/ENVIRONMENT REFERENCE VECTORS:" });
              imageGen.worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
          }
          if (imageGen.styleRefs.length > 0) {
              parts.push({ text: "AESTHETIC/STYLE REFERENCE VECTORS:" });
              imageGen.styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
          }

          parts.push({ text: "Synthesize a comprehensive Production Bible for this film series. Ensure extreme realism and consistent theme application. Output JSON {theme, atmosphere, visualLogic, narrativeArc, opticProfile, cinematicNotes[]}." });

          const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
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
                          narrativeArc: { type: Type.STRING },
                          opticProfile: { type: Type.STRING },
                          cinematicNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ['theme', 'atmosphere', 'visualLogic', 'narrativeArc', 'opticProfile', 'cinematicNotes']
                  }
              }
          }));

          const bible = JSON.parse(response.text || '{}');
          setProductionBible(bible);
          addLog('SUCCESS', 'PRODUCTION_BIBLE: Cinematic DNA locked. Theme consistency prioritized.');
          audio.playSuccess();
      } catch (err: any) {
          addLog('ERROR', `SCAN_FAIL: ${err.message}`);
      } finally {
          setIsSynthesizingBible(false);
      }
  };

  const generateSingleImage = async () => {
      if (!imageGen.prompt?.trim() && imageGen.characterRefs.length === 0) return;
      if (!(await checkApiKey())) return;

      setImageGenState({ isLoading: true, error: null });
      audio.playClick();

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const usePro = imageGen.quality !== ImageSize.SIZE_1K;
          const model = usePro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
          
          const contextualPrompt = productionBible 
            ? `PRODUCTION_BIBLE_CONTEXT: ${productionBible.theme}. OPTICS: ${productionBible.opticProfile}. AESTHETIC: ${productionBible.visualLogic}. DIRECTIVE: ${imageGen.prompt}`
            : imageGen.prompt;

          const finalPrompt = await constructCinematicPrompt(
              contextualPrompt || "A cinematic still shot on 35mm.", 
              imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
              imageGen.characterRefs.length > 0, 
              imageGen.worldRefs.length > 0, 
              imageGen.styleRefs.length > 0, 
              productionBible?.cinematicNotes.join(' '), 
              imageGen.activeStylePreset
          );

          const parts: any[] = [];
          imageGen.characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
          imageGen.worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
          imageGen.styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
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
              addLog('SUCCESS', `ASSET_STUDIO: Render finalized at ${imageGen.quality}.`); 
              audio.playSuccess();
          } else {
              throw new Error("Empty buffer from cinematic core.");
          }
      } catch (err: any) { 
          setImageGenState({ error: err.message, isLoading: false }); 
          addLog('ERROR', `RENDER_FAIL: ${err.message}`); 
          audio.playError();
      }
  };

  const handlePlanSequence = async () => {
    if (!imageGen.prompt?.trim() && !productionBible) return;
    setIsPlanning(true);
    addLog('SYSTEM', 'DIRECTOR: Forging narrative sequence timeline...');
    try {
        if (!(await checkApiKey())) { setIsPlanning(false); return; }
        
        const directorDirective = productionBible 
            ? `THEME: ${productionBible.theme}. ARC: ${productionBible.narrativeArc}. STYLE: ${productionBible.visualLogic}. OPTICS: ${productionBible.opticProfile}. USER_INPUT: ${imageGen.prompt}`
            : imageGen.prompt;

        const plan = await generateStoryboardPlan(directorDirective);
        setFrames(plan.map((p, i) => ({
            index: i,
            scenePrompt: p.scenePrompt,
            continuity: p.continuity,
            camera: p.camera || 'Cinematic 35mm',
            lighting: p.lighting || 'Masterpiece Key-Light',
            status: 'pending'
        })));
        addLog('SUCCESS', 'DIRECTOR: Timeline synchronized. Continuous logic locked.');
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
        
        const resCurve = imageGen.resonanceCurve?.[idx];
        const resonance = resCurve 
          ? `[Intensity: ${resCurve.tension}%] [Texture: ${resCurve.dynamics}%]`
          : "";

        const finalPrompt = await constructCinematicPrompt(
            `BIBLE: ${productionBible?.theme}. SCENE_${idx}: ${frame.scenePrompt} ${resonance}`, 
            imageGen.activeColorway || SOVEREIGN_DEFAULT_COLORWAY, 
            imageGen.characterRefs.length > 0, 
            imageGen.worldRefs.length > 0, 
            imageGen.styleRefs.length > 0, 
            `CAM: ${frame.camera}. LITE: ${frame.lighting}. CONT: ${frame.continuity}`, 
            imageGen.activeStylePreset
        );

        const parts: any[] = [];
        imageGen.characterRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
        imageGen.worldRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
        imageGen.styleRefs.forEach(ref => parts.push({ inlineData: ref.inlineData }));
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
            throw new Error("Bitstream dropout.");
        }
    } catch (err: any) {
        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: err.message } : f));
    }
  };

  const renderSequence = async () => {
    setIsBatchRendering(true);
    addLog('SYSTEM', 'STUDIO_RENDER: Batch-processing high-fidelity sequence...');
    for (let i = 0; i < frames.length; i++) {
        if (frames[i].status === 'done') continue;
        await renderFrame(i);
        await new Promise(r => setTimeout(r, 1200)); 
    }
    setIsBatchRendering(false);
    addLog('SUCCESS', 'STUDIO_RENDER: Sequence fabricated and archived.');
    audio.playSuccess();
  };

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) return;
    if (!(await checkApiKey())) return;

    setIsVideoLoading(true);
    setVideoUrl(null);
    setVideoProgressMsg("Priming VEO Temporal Handshake...");
    addLog('SYSTEM', 'VEO_CORE: Forging high-motion cinematic sequence...');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // VEO Context synthesis to ensure consistency with initial uploads
        const veoDirective = productionBible 
            ? `WITHIN THE WORLD OF ${productionBible.theme}, ${videoPrompt}. VISUALS: ${productionBible.opticProfile}. ENSURE CHARACTER CONSISTENCY WITH REFERENCE IMAGE.`
            : videoPrompt;

        // Use the first identity reference as the motion seed to lock character consistency
        const characterAnchor = imageGen.characterRefs[0];

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: veoDirective,
            image: characterAnchor ? {
                imageBytes: characterAnchor.inlineData.data,
                mimeType: characterAnchor.inlineData.mimeType
            } : undefined,
            config: {
                numberOfVideos: 1,
                resolution: videoRes as any,
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            setVideoProgressMsg(`Syncing Temporal Vectors... [${Math.floor(Math.random() * 30 + 30)}%]`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        addLog('SUCCESS', 'VEO_COMPLETE: Temporal sequence stabilized at 1080p.');
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
    const folder = zip.folder("cinematic_deliverables");
    
    addLog('SYSTEM', 'DELIVERY: Compiling production archive...');
    
    for (const frame of frames) {
      if (frame.imageUrl) {
        try {
          const response = await fetch(frame.imageUrl);
          const blob = await response.blob();
          folder?.file(`node_${frame.index + 1}.png`, blob);
        } catch (e) { console.error(e); }
      }
    }
    
    if (productionBible) {
        folder?.file("production_bible.json", JSON.stringify(productionBible, null, 2));
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `production_${Date.now()}.zip`;
    link.click();
    addLog('SUCCESS', 'DELIVERY: Multi-asset archive downloaded.');
    audio.playSuccess();
  };

  const generateTeaserAudioForIndex = async (idx: number) => {
    const currentFrame = frames[idx];
    if (!currentFrame || !currentFrame.scenePrompt) return;
    
    addLog('SYSTEM', `SOUND_STUDIO: Synthesizing narrative for Node_${idx+1}...`);
    
    try {
      if (!(await checkApiKey())) return;
      const narrativeText = productionBible 
        ? `In the cinematic world of ${productionBible.theme}, ${currentFrame.scenePrompt}`
        : currentFrame.scenePrompt;

      const { audioData } = await generateAudioOverview([{ 
          inlineData: { data: '', mimeType: 'text/plain' }, 
          name: narrativeText 
      }]);
      
      if (audioData) {
        setFrames(prev => prev.map((f, i) => i === idx ? { ...f, audioUrl: `data:audio/pcm;base64,${audioData}` } : f));
        return `data:audio/pcm;base64,${audioData}`;
      }
    } catch (err: any) {
        addLog('ERROR', `SOUND_FAIL_NODE_${idx+1}: ${err.message}`);
    }
    return null;
  };

  const playFullSequence = async () => {
      if (frames.length === 0) return;
      setIsAutoPlaying(true);
      addLog('SYSTEM', 'SCREENING: Initializing full narrative sequence playback...');
      
      for (let i = 0; i < frames.length; i++) {
          if (!isAutoPlaying && i > 0) break; // Allow manual interrupt
          setTeaserIdx(i);
          
          let audioUrl = frames[i].audioUrl;
          if (!audioUrl) {
              audioUrl = await generateTeaserAudioForIndex(i) || undefined;
          }
          
          // Simulation of audio playback wait (high-level timing)
          if (audioUrl) {
              await new Promise(r => setTimeout(r, 6000));
          } else {
              await new Promise(r => setTimeout(r, 4000));
          }
      }
      setIsAutoPlaying(false);
      addLog('SUCCESS', 'SCREENING: Sequence playback finalized.');
  };

  const generateAllSequenceAudio = async () => {
      addLog('SYSTEM', 'SOUND_STUDIO: Batch synthesizing all sequence narration...');
      for (let i = 0; i < frames.length; i++) {
          if (frames[i].audioUrl) continue;
          await generateTeaserAudioForIndex(i);
          await new Promise(r => setTimeout(r, 500));
      }
      addLog('SUCCESS', 'SOUND_STUDIO: Batch synthesis complete.');
      audio.playSuccess();
  };

  const renderRefs = (type: 'CHAR' | 'SET' | 'STYLE') => {
      const refs = type === 'CHAR' ? imageGen.characterRefs : type === 'SET' ? imageGen.worldRefs : imageGen.styleRefs;
      const Icon = type === 'CHAR' ? UserCircle : type === 'SET' ? MapIcon : Palette;
      const label = type === 'CHAR' ? 'Identity' : type === 'SET' ? 'World' : 'Aesthetic';

      return (
          <div className="space-y-3 shrink-0">
              <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Icon size={12} /> {label} Vector
                  </span>
                  <label className="p-1 cursor-pointer hover:text-white text-gray-600 transition-colors">
                      <Plus size={14}/>
                      <input type="file" multiple className="hidden" onChange={(e) => handleRefUpload(e, type)} />
                  </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                  {refs.map((ref, i) => (
                      <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-white/5 group/ref">
                          <img src={`data:${ref.inlineData.mimeType};base64,${ref.inlineData.data}`} className="w-full h-full object-cover grayscale-[30%] group-hover/ref:grayscale-0 transition-all" />
                          <button onClick={() => removeRef(i, type)} className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white opacity-0 group-hover/ref:opacity-100 transition-opacity"><X size={10}/></button>
                      </div>
                  ))}
                  <label className="aspect-square rounded-lg border border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[#9d4edd]/40 group/add">
                      <Plus size={16} className="text-gray-700 group-hover/add:text-[#9d4edd] transition-colors" />
                      <input type="file" multiple className="hidden" onChange={(e) => handleRefUpload(e, type)} />
                  </label>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col border border-[#1f1f1f] rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] relative z-10 font-sans group/studio">
        
        {/* Cinematic Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-50 bg-[length:100%_4px] opacity-20" />

        {/* Global Studio Header */}
        <div className="h-20 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-2xl z-[60] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/40 to-transparent" />
            
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-xl shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <Aperture className="w-5 h-5 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Cinema Engine</h1>
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Prime Production // v8.1</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-white/5" />
                <div className="flex items-center gap-1 bg-[#050505] p-1.5 rounded-2xl border border-white/5">
                    {[
                        { id: 'SINGLE', label: 'Stills', icon: Wand2 },
                        { id: 'STORYBOARD', label: 'Timeline', icon: Clapperboard },
                        { id: 'VIDEO', label: 'Motion', icon: Video },
                        { id: 'TEASER', label: 'Screening', icon: MonitorPlay }
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
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Spectral Integrity</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#10b981] uppercase">Optimal</span>
                        <div className="flex gap-0.5">
                            {[1,1,1,1].map((v, i) => <div key={i} className={`w-1 h-3 rounded-full ${v ? 'bg-[#10b981]' : 'bg-[#222]'}`} />)}
                        </div>
                    </div>
                </div>
                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all">
                    <Settings size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative z-10 flex">
            <AnimatePresence mode="wait">
                {activeTab === 'SINGLE' && (
                    <motion.div key="single" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full h-full flex gap-10 p-10 overflow-hidden">
                        {/* Sidebar: Global References */}
                        <div className="w-[420px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-4">
                            
                            <div className="text-[10px] font-black text-[#9d4edd] font-mono uppercase tracking-[0.4em] flex items-center gap-2 px-1 shrink-0">
                                <Award size={14} /> Production Matrix
                            </div>

                            <div className="space-y-6 shrink-0">
                                {renderRefs('CHAR')}
                                {renderRefs('SET')}
                                {renderRefs('STYLE')}
                            </div>

                            <button 
                                onClick={synthesizeProductionBible}
                                disabled={isSynthesizingBible || (imageGen.characterRefs.length === 0 && imageGen.worldRefs.length === 0 && imageGen.styleRefs.length === 0)}
                                className={`w-full py-5 border rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-2xl shrink-0
                                    ${productionBible ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-[#111] border-[#333] text-gray-500 hover:text-white'}
                                `}
                            >
                                {isSynthesizingBible ? <Loader2 size={16} className="animate-spin" /> : productionBible ? <ShieldCheck size={18}/> : <Binary size={18} />}
                                {productionBible ? 'Production Bible Locked' : 'Forge Production Bible'}
                            </button>

                            <AnimatePresence>
                                {productionBible && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6 bg-[#0a0a0a] border border-[#10b981]/20 rounded-3xl space-y-4 shadow-inner shrink-0 overflow-hidden">
                                        <div className="flex items-center justify-between text-[#10b981]">
                                            <div className="flex items-center gap-2">
                                                <FileJson size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Active Manifest</span>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[11px] text-gray-300 font-mono italic leading-relaxed">"{productionBible.theme}. {productionBible.visualLogic}"</p>
                                            <div className="flex flex-wrap gap-2">
                                                {productionBible.cinematicNotes.slice(0,3).map((note, i) => (
                                                    <span key={i} className="text-[8px] px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-500 font-mono truncate max-w-[120px]">{note}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col gap-4 mt-2 shrink-0">
                                <span className="text-[10px] font-black text-[#9d4edd] font-mono uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                                    <Focus size={14} /> Master Directive
                                </span>
                                <textarea 
                                    value={imageGen.prompt} 
                                    onChange={e => setImageGenState({ prompt: e.target.value })}
                                    className="w-full h-40 bg-[#0a0a0a] border border-[#222] p-6 rounded-[2.5rem] text-sm font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800 shadow-inner group-hover:border-[#333]" 
                                    placeholder="Input core narrative intent sequence..." 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 shrink-0">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-2">Optics (Aspect)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.values(AspectRatio).map(r => (
                                            <button key={r} onClick={() => setImageGenState({ aspectRatio: r })} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${imageGen.aspectRatio === r ? 'bg-[#9d4edd] border-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20' : 'bg-[#0a0a0a] border-[#222] text-gray-600 hover:text-gray-400'}`}>{r}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-2">Fidelity (Tier)</label>
                                    <div className="flex flex-col gap-2">
                                        {[ImageSize.SIZE_1K, ImageSize.SIZE_2K, ImageSize.SIZE_4K].map(s => (
                                            <button key={s} onClick={() => setImageGenState({ quality: s })} className={`w-full py-3 rounded-xl text-[10px] font-black border transition-all ${imageGen.quality === s ? 'bg-[#22d3ee] border-[#22d3ee] text-black shadow-lg shadow-[#22d3ee]/20' : 'bg-[#0a0a0a] border-[#222] text-gray-600 hover:text-white'}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={generateSingleImage} 
                                disabled={imageGen.isLoading || (!imageGen.prompt?.trim() && imageGen.characterRefs.length === 0)}
                                className="w-full py-6 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-xs uppercase tracking-[0.5em] rounded-[2.5rem] transition-all shadow-[0_30px_60px_rgba(157,78,221,0.4)] flex items-center justify-center gap-5 group/btn active:scale-95 disabled:opacity-50 shrink-0 mb-10"
                            >
                                {imageGen.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap size={22} className="group-hover/btn:scale-125 transition-transform" />}
                                {imageGen.isLoading ? 'Processing Scene...' : 'Render Master Frame'}
                            </button>
                        </div>

                        {/* Viewport Area */}
                        <div className="flex-1 flex flex-col gap-6 min-w-0 h-full">
                            <div className="flex-1 bg-[#050505] border border-[#1f1f1f] rounded-[3.5rem] overflow-hidden relative flex items-center justify-center shadow-2xl group/viewport">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.02)_0%,transparent_80%)] pointer-events-none" />
                                
                                <AnimatePresence mode="wait">
                                    {imageGen.isLoading ? (
                                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-10">
                                            <div className="relative">
                                                <Loader2 size={80} className="text-[#9d4edd] animate-spin" />
                                                <div className="absolute inset-0 blur-3xl bg-[#9d4edd]/20 animate-pulse" />
                                            </div>
                                            <div className="text-center space-y-3">
                                                <p className="text-sm font-black font-mono text-white uppercase tracking-[0.8em]">Inverting spectral logic...</p>
                                                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Coherence Matrix Synthesis v4.0 Active</p>
                                            </div>
                                        </motion.div>
                                    ) : imageGen.generatedImage ? (
                                        <motion.div key="image" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full p-10 flex items-center justify-center">
                                            <img src={imageGen.generatedImage.url} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_60px_120px_rgba(0,0,0,1)] border border-white/5 transition-transform duration-1000 group-hover/viewport:scale-[1.01]" alt="Generated Output" />
                                            
                                            {/* Technical Overlays */}
                                            <div className="absolute top-14 left-14 flex flex-col gap-4">
                                                <MetadataTag label="Production Node" value="A100_VOLTA_HUB" />
                                                <MetadataTag label="Optic Profile" value={imageGen.quality === ImageSize.SIZE_1K ? "FLASH_Cinematic" : "PRO_HighFidelity"} color="#22d3ee" />
                                            </div>
                                            <div className="absolute bottom-14 right-14 flex flex-col items-end gap-4">
                                                <div className="px-5 py-3 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl">
                                                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-black">RES: {imageGen.quality} // {imageGen.aspectRatio}</span>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-10 group-hover/viewport:opacity-20 transition-all duration-1000 text-center space-y-8">
                                            <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center relative">
                                                <Aperture size={80} className="text-gray-500" />
                                                <div className="absolute inset-0 rounded-full border border-[#9d4edd]/20 animate-ping" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xl font-mono uppercase tracking-[0.6em]">Viewport Standby</p>
                                                <p className="text-[11px] font-mono text-gray-600 uppercase tracking-widest">Establish reference vectors to initialize rendering</p>
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="h-20 bg-[#0a0a0a]/60 backdrop-blur-2xl border border-[#1f1f1f] rounded-[2.5rem] px-12 flex items-center justify-between shrink-0 shadow-2xl">
                                <div className="flex items-center gap-10">
                                    <button className="flex items-center gap-3 text-[11px] font-black font-mono text-gray-500 hover:text-white transition-all group">
                                        <Eye size={18} className="group-hover:scale-125 transition-transform" /> INSPECT_GRAIN
                                    </button>
                                    <button className="flex items-center gap-3 text-[11px] font-black font-mono text-gray-500 hover:text-white transition-all group">
                                        <Layers size={18} className="group-hover:scale-125 transition-transform" /> DEPTH_MAP
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => imageGen.generatedImage && openHoloProjector({ id: 'current', title: 'Master Frame', type: 'IMAGE', content: imageGen.generatedImage.url })} className="px-8 py-3 bg-white/5 border border-white/10 hover:border-white/40 text-gray-300 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Fullscreen</button>
                                    <button 
                                        onClick={() => imageGen.generatedImage && downloadAsset(imageGen.generatedImage.url, `master_frame_${Date.now()}.png`)} 
                                        className="px-8 py-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(157,78,221,0.2)] active:scale-95"
                                    >
                                        <Download size={16}/> Secure Buffer
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar: Active Studio Crew */}
                        <div className="w-[320px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar">
                            <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[2rem] flex flex-col gap-6 shadow-2xl shrink-0">
                                <div className="flex items-center gap-3 mb-2 px-1">
                                    <Users size={16} className="text-[#22d3ee]" />
                                    <h2 className="text-[10px] font-black font-mono text-white uppercase tracking-[0.4em]">Active Studio Crew</h2>
                                </div>
                                <div className="space-y-3">
                                    <CrewSlot role="Director" status="Narrative Mapping" icon={DirectorIcon} color="#9d4edd" />
                                    <CrewSlot role="DP / Optics" status="Anamorphic Tuning" icon={Aperture} color="#22d3ee" />
                                    <CrewSlot role="Lighting Head" status="Ray-Tracing L0" icon={Sun} color="#f59e0b" />
                                    <CrewSlot role="Editor" status="Continuity Lock" icon={Scissors} color="#10b981" />
                                </div>
                                <div className="pt-4 border-t border-white/5 mt-2 flex flex-col gap-4 px-1">
                                    <div className="flex justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                        <span>Studio Load</span>
                                        <span>34%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div animate={{ width: '34%' }} className="h-full bg-[#9d4edd]" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-h-[200px] bg-gradient-to-br from-[#9d4edd]/5 to-transparent border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center text-center relative overflow-hidden group/award shrink-0 mb-10">
                                <Award size={48} className="mx-auto text-[#f1c21b] mb-6 group-hover/award:scale-125 transition-transform duration-700" />
                                <h3 className="text-xs font-black font-mono text-white uppercase tracking-widest mb-4">Award-Ready Fidelity</h3>
                                <p className="text-[10px] text-gray-500 font-mono leading-relaxed px-4">Assets optimized for large-scale projection and cinematic delivery chains.</p>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(241,194,27,0.05)_0%,transparent_70%)] opacity-0 group-hover/award:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'STORYBOARD' && (
                    <motion.div key="storyboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="w-full h-full flex flex-col overflow-hidden">
                        <div className="flex-1 flex gap-8 p-8 overflow-hidden">
                            <div className="w-[400px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-[3rem] flex flex-col shrink-0 shadow-2xl overflow-hidden">
                                <div className="p-10 border-b border-[#1f1f1f] bg-white/[0.02]">
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-[11px] font-black text-[#9d4edd] font-mono uppercase tracking-[0.5em]">Director's Script</span>
                                        <Clapperboard size={20} className="text-[#9d4edd]" />
                                    </div>
                                    <textarea 
                                        value={imageGen.prompt} 
                                        onChange={e => setImageGenState({ prompt: e.target.value })}
                                        className="w-full h-36 bg-black border border-[#222] p-6 rounded-[2rem] text-sm font-mono text-gray-300 outline-none focus:border-[#9d4edd] resize-none transition-all placeholder:text-gray-800 shadow-inner"
                                        placeholder="Define the narrative arc and emotional beats..."
                                    />
                                    <button 
                                        onClick={handlePlanSequence} 
                                        disabled={isPlanning || (!imageGen.prompt?.trim() && !productionBible)}
                                        className="w-full py-5 mt-8 bg-[#9d4edd]/10 border border-[#9d4edd]/40 text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 disabled:opacity-30 shadow-2xl active:scale-95"
                                    >
                                        {isPlanning ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />}
                                        Initialize Script Synthesis
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                                    <div className="space-y-5">
                                        <span className="text-[10px] font-black text-gray-500 font-mono uppercase tracking-widest flex items-center gap-3 px-2"><Activity size={16}/> Resonance Curve</span>
                                        <EmotionalResonanceGraph />
                                    </div>
                                    
                                    <div className="pt-6 border-t border-white/5 space-y-5">
                                        <span className="text-[10px] font-black text-gray-500 font-mono uppercase tracking-widest block pl-2">Render Fidelity</span>
                                        <div className="flex gap-3">
                                            {[ImageSize.SIZE_1K, ImageSize.SIZE_2K].map(s => (
                                                <button key={s} onClick={() => setImageGenState({ quality: s })} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase transition-all ${imageGen.quality === s ? 'bg-[#22d3ee] border-[#22d3ee] text-black shadow-lg' : 'bg-black border-[#222] text-gray-600 hover:text-white'}`}>{s} Delivery</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-[#050505] border-t border-[#1f1f1f] space-y-4">
                                    <button 
                                        onClick={renderSequence} 
                                        disabled={isBatchRendering || frames.length === 0}
                                        className="w-full py-6 bg-[#9d4edd] text-black font-black font-mono text-xs uppercase tracking-[0.5em] rounded-[2rem] hover:bg-[#b06bf7] transition-all shadow-[0_20px_50px_rgba(157,78,221,0.3)] flex items-center justify-center gap-4 disabled:opacity-30 active:scale-95"
                                    >
                                        {isBatchRendering ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} className="fill-current" />}
                                        Render Production Sequence
                                    </button>
                                    <button onClick={exportZip} className="w-full py-5 bg-white/5 border border-white/10 text-gray-500 hover:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"><Download size={18}/> Export Distribution Pack</button>
                                </div>
                            </div>

                            <div className="flex-1 bg-black/40 border border-[#1f1f1f] rounded-[3.5rem] overflow-y-auto custom-scrollbar p-10 shadow-inner">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 pb-10">
                                    {frames.map((f, i) => (
                                        <motion.div 
                                            key={i} 
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`bg-[#0a0a0a] border rounded-[2.5rem] overflow-hidden transition-all duration-700 relative group shrink-0
                                                ${f.status === 'done' ? 'border-emerald-500/20 bg-emerald-950/5' : f.status === 'generating' ? 'border-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.1)] animate-pulse' : 'border-[#1f1f1f] hover:border-[#333]'}
                                            `}
                                        >
                                            <div className="aspect-video bg-black relative overflow-hidden group/frame">
                                                {f.imageUrl ? (
                                                    <img src={f.imageUrl} className="w-full h-full object-cover group-hover/frame:scale-110 transition-transform duration-[8s]" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 gap-6">
                                                        <Film size={64} className="text-gray-500" />
                                                        <span className="text-[11px] font-mono uppercase tracking-[0.5em]">Frame_{String(i+1).padStart(2,'0')} Pending</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-6 left-6 px-4 py-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black font-mono text-white z-10 shadow-2xl uppercase">Node_{i+1}</div>
                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/frame:opacity-100 transition-opacity flex items-center justify-center gap-5 z-20">
                                                    <button onClick={() => renderFrame(i)} className="p-4 bg-[#9d4edd] text-black rounded-2xl shadow-2xl hover:scale-110 transition-transform active:scale-95"><RefreshCw size={24} /></button>
                                                    {f.imageUrl && <button onClick={() => openHoloProjector({ id: `f-${i}`, title: `Frame ${i+1}`, type: 'IMAGE', content: f.imageUrl })} className="p-4 bg-white text-black rounded-2xl shadow-2xl hover:scale-110 transition-transform active:scale-95"><Maximize size={24}/></button>}
                                                </div>
                                            </div>
                                            <div className="p-8 space-y-6 overflow-y-auto max-h-[300px] custom-scrollbar">
                                                <div className="flex justify-between items-center text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest">
                                                    <span>Scene Protocol</span>
                                                    {f.status === 'done' && <CheckCircle size={16} className="text-[#10b981]" />}
                                                </div>
                                                <textarea 
                                                    value={f.scenePrompt} 
                                                    onChange={e => { const n = [...frames]; n[i].scenePrompt = e.target.value; setFrames(n); }}
                                                    className="w-full h-24 bg-black/60 border border-white/5 p-5 rounded-2xl text-xs font-mono text-gray-300 outline-none focus:border-[#9d4edd] transition-all resize-none shadow-inner"
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                        <div className="text-[7px] text-gray-500 uppercase font-black mb-1">Camera Optic</div>
                                                        <div className="text-[10px] text-gray-300 font-mono truncate">{f.camera}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                        <div className="text-[7px] text-gray-500 uppercase font-black mb-1">Gaffer Profile</div>
                                                        <div className="text-[10px] text-gray-300 font-mono truncate">{f.lighting}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'VIDEO' && (
                    <motion.div key="video" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full h-full flex gap-10 p-10 overflow-hidden">
                        <div className="w-[420px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2">
                            <div className="p-10 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[3rem] flex flex-col gap-8 shadow-2xl relative overflow-hidden shrink-0">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><Video size={100} /></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <Video className="w-6 h-6 text-[#d946ef]" />
                                    <h2 className="text-base font-black font-mono text-white uppercase tracking-[0.5em]">VEO Temporal Engine</h2>
                                </div>
                                
                                <div className="space-y-4 relative z-10">
                                    <label className="text-[11px] font-black text-gray-500 font-mono uppercase tracking-widest pl-3">Motion Directive Matrix</label>
                                    <textarea 
                                        value={videoPrompt} 
                                        onChange={e => setVideoPrompt(e.target.value)}
                                        className="w-full h-56 bg-black border border-[#222] p-8 rounded-[2.5rem] text-sm font-mono text-gray-300 outline-none focus:border-[#d946ef] resize-none transition-all shadow-inner placeholder:text-gray-800"
                                        placeholder="Describe cinematic motion sequence and optic travel..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5 relative z-10">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-2">Resolution</label>
                                        <div className="flex gap-2">
                                            {['720p', '1080p'].map(res => (
                                                <button key={res} onClick={() => setVideoRes(res as any)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${videoRes === res ? 'bg-[#d946ef] border-[#d946ef] text-black shadow-lg shadow-[#d946ef]/40' : 'bg-black border-[#222] text-gray-600 hover:text-white'}`}>{res}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-right">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pr-2">Coherence Target</label>
                                        <div className="h-11 flex items-center justify-end px-5 bg-black border border-white/5 rounded-xl shadow-inner">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-mono font-black text-[#10b981] uppercase tracking-tighter">Temporal_Max</span>
                                                <ShieldCheck size={14} className="text-[#10b981]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleVideoGenerate} 
                                    disabled={isVideoLoading || !videoPrompt.trim()}
                                    className="w-full py-6 bg-[#d946ef] hover:bg-[#f0abfc] text-black font-black font-mono text-sm uppercase tracking-[0.5em] rounded-[2.5rem] transition-all shadow-[0_30px_70px_rgba(217,70,239,0.4)] flex items-center justify-center gap-5 disabled:opacity-50 active:scale-95 relative z-10 mb-2"
                                >
                                    {isVideoLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Play size={24} className="fill-current" />}
                                    {isVideoLoading ? 'Synthesizing...' : 'Forge Temporal Sequence'}
                                </button>
                            </div>
                            
                            {/* Additional Context Box for VEO consistency */}
                            <div className="p-8 bg-[#111]/40 border border-white/5 rounded-[2.5rem] shrink-0 mb-10 overflow-hidden">
                                <div className="flex items-center gap-3 mb-4">
                                    <Target size={16} className="text-[#d946ef]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-mono">Consolidated Context</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                                    VEO is currently anchored to {imageGen.characterRefs.length > 0 ? 'the primary Identity Vector' : 'no visual anchor'}. 
                                    Thematic consistency is managed via the locked Production Bible.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 bg-black border border-[#1f1f1f] rounded-[4rem] overflow-hidden relative shadow-2xl flex items-center justify-center group/video-p h-full min-h-0">
                            <AnimatePresence mode="wait">
                                {isVideoLoading ? (
                                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-12">
                                        <div className="relative">
                                            <div className="w-32 h-32 rounded-full border-4 border-t-[#d946ef] border-white/10 animate-spin" />
                                            <div className="absolute inset-0 blur-3xl bg-[#d946ef]/30 animate-pulse" />
                                        </div>
                                        <div className="text-center space-y-4">
                                            <p className="text-2xl font-black font-mono text-white uppercase tracking-[0.6em] animate-pulse">{videoProgressMsg}</p>
                                            <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.4em]">Maintaining global temporal alignment nodes...</p>
                                        </div>
                                    </motion.div>
                                ) : videoUrl ? (
                                    <motion.div key="video-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative group/controls">
                                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain bg-black" />
                                        <div className="absolute top-10 right-10 opacity-0 group-hover/controls:opacity-100 transition-opacity">
                                            <div className="px-5 py-2 bg-black/60 backdrop-blur-2xl border border-[#d946ef]/40 rounded-full text-[#d946ef] text-[10px] font-black font-mono tracking-widest uppercase shadow-2xl">
                                                DELIVERY_LOCKED // {videoRes}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center opacity-10 group-hover/video-p:opacity-20 transition-all duration-1000 gap-10">
                                        <Video size={140} className="text-gray-500" />
                                        <p className="text-xl font-mono uppercase tracking-[0.8em]">Temporal Hub Standby</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'TEASER' && (
                    <motion.div key="teaser" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="w-full h-full flex flex-col p-10 gap-10 overflow-hidden">
                        <div className="flex-1 bg-black rounded-[4rem] border border-[#1f1f1f] relative overflow-hidden group/theatre shadow-[0_80px_200px_rgba(0,0,0,1)] flex items-center justify-center min-h-0">
                            
                            {/* Ambient Production Glow */}
                            <AnimatePresence mode="wait">
                                {frames[teaserIdx]?.imageUrl && (
                                    <motion.div 
                                        key={`blur-${teaserIdx}`}
                                        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 2 }}
                                        className="absolute inset-0 blur-[150px] scale-150 saturate-200"
                                    >
                                        <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover" alt="" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl z-0" />

                            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 overflow-y-auto custom-scrollbar">
                                <AnimatePresence mode="wait">
                                    {frames[teaserIdx]?.imageUrl ? (
                                        <motion.div 
                                            key={teaserIdx} 
                                            initial={{ opacity: 0, y: 40, scale: 0.98 }} 
                                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                                            exit={{ opacity: 0, y: -40, scale: 1.02 }} 
                                            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                                            className="relative flex flex-col items-center gap-10 w-full max-w-7xl"
                                        >
                                            <div className="w-full aspect-video rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] border border-white/10 relative group/hero shrink-0">
                                                <img src={frames[teaserIdx].imageUrl} className="w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-[15s] ease-linear" alt="Theater View" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-60" />
                                                
                                                <div className="absolute top-10 left-10 flex items-center gap-6">
                                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full text-[11px] font-black font-mono text-white shadow-2xl">
                                                        <Target size={16} className="text-[#9d4edd] animate-pulse" />
                                                        <span className="tracking-[0.2em] uppercase">Node_Protocol_{String(teaserIdx+1).padStart(2,'0')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center space-y-8 max-w-5xl overflow-y-auto max-h-[300px] custom-scrollbar px-4">
                                                <div className="flex justify-center items-center gap-8 shrink-0">
                                                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                    <span className="text-[12px] font-black text-[#9d4edd] uppercase tracking-[1em] whitespace-nowrap">Lattice Screening Synthesis</span>
                                                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-40" />
                                                </div>
                                                <p className="text-4xl font-mono text-white leading-relaxed italic font-medium selection:bg-[#9d4edd]/40 tracking-tight drop-shadow-[0_10px_30px_rgba(0,0,0,1)] pb-4">
                                                    "{frames[teaserIdx].scenePrompt}"
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-10 gap-8">
                                            <Monitor size={120} className="text-gray-500" />
                                            <p className="text-2xl font-mono uppercase tracking-[1em]">Screening Cache Empty</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Screening Room HUD */}
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-14 px-16 py-8 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-[0_60px_150px_rgba(0,0,0,0.9)] opacity-0 group-hover/theatre:opacity-100 transition-all duration-700 transform translate-y-6 group-hover/theatre:translate-y-0 max-w-[90%] flex-wrap justify-center">
                                <div className="flex items-center gap-8">
                                    <button onClick={() => setTeaserIdx(p => (p - 1 + frames.length) % frames.length)} className="p-5 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"><FastForward size={36} className="rotate-180" /></button>
                                    <button 
                                        onClick={() => { setIsAutoPlaying(!isAutoPlaying); if (!isAutoPlaying) playFullSequence(); audio.playClick(); }} 
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)] active:scale-95
                                            ${isAutoPlaying ? 'bg-white text-black shadow-white/20' : 'bg-[#9d4edd] text-black shadow-[#9d4edd]/50'}
                                        `}
                                    >
                                        {isAutoPlaying ? <Pause size={48} /> : <Play size={48} fill="currentColor" className="ml-1.5" />}
                                    </button>
                                    <button onClick={() => setTeaserIdx(p => (p + 1) % frames.length)} className="p-5 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"><FastForward size={36} /></button>
                                </div>
                                <div className="h-16 w-px bg-white/10 hidden md:block" />
                                <div className="flex items-center gap-6">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={generateAllSequenceAudio} 
                                            disabled={isGeneratingTeaserAudio || frames.length === 0} 
                                            className={`p-6 rounded-3xl transition-all shadow-2xl bg-white/5 text-gray-500 hover:text-[#9d4edd] hover:bg-[#9d4edd]/10`}
                                            title="Synthesize All Narrations"
                                        >
                                            <Speaker size={32} />
                                        </button>
                                        <button 
                                            onClick={() => generateTeaserAudioForIndex(teaserIdx)} 
                                            disabled={isGeneratingTeaserAudio || !frames[teaserIdx]?.imageUrl} 
                                            className={`p-6 rounded-3xl transition-all shadow-2xl ${isGeneratingTeaserAudio ? 'bg-[#9d4edd] text-black animate-pulse shadow-[#9d4edd]/30' : 'bg-white/5 text-gray-500 hover:text-[#9d4edd] hover:bg-[#9d4edd]/10'}`}
                                            title="Regenerate Active Node Audio"
                                        >
                                            <Volume2 size={32} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[14px] font-black text-white uppercase tracking-widest leading-none mb-2">Theater HUD</span>
                                        <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest truncate">Uplink: {isAutoPlaying ? 'SEQUENCE_STREAMING' : '1080p_STABLE'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Screening Strip */}
                        <div className="h-32 bg-[#0a0a0a]/40 backdrop-blur-2xl rounded-[2.5rem] border border-[#1f1f1f] p-5 flex gap-6 overflow-x-auto no-scrollbar shadow-2xl shrink-0 group/timeline-strip">
                            {frames.map((f, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => { setTeaserIdx(i); setIsAutoPlaying(false); audio.playClick(); }}
                                    className={`relative w-56 h-full rounded-2xl border-2 overflow-hidden transition-all duration-700 shrink-0 group/tn
                                        ${teaserIdx === i ? 'border-[#9d4edd] ring-8 ring-[#9d4edd]/10 scale-105 shadow-[0_0_40px_rgba(157,78,221,0.4)] z-10' : 'border-transparent opacity-30 hover:opacity-100 hover:border-white/20'}
                                    `}
                                >
                                    {f.imageUrl ? (
                                        <img src={f.imageUrl} className="w-full h-full object-cover group-hover/tn:scale-110 transition-transform duration-1000" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-[#050505] flex items-center justify-center text-[11px] font-mono text-gray-700 uppercase tracking-widest">Node_{i+1}</div>
                                    )}
                                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/80 rounded-lg text-[8px] font-black font-mono text-white opacity-60 uppercase tracking-widest shadow-2xl">F_{i+1}</div>
                                    {teaserIdx === i && <div className="absolute inset-0 bg-[#9d4edd]/10 pointer-events-none" />}
                                    {f.audioUrl && <div className="absolute top-2 right-2 p-1 bg-[#10b981]/80 rounded-full border border-white/20"><Volume2 size={8} className="text-white"/></div>}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Global Production Footer HUD */}
        <div className="h-10 bg-[#0a0a0a] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0 relative z-[60]">
            <div className="flex gap-10 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                <div className="flex items-center gap-3 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                    <CheckCircle size={14} className="shadow-[0_0_10px_#10b981]" /> Sync_Stable
                </div>
                <div className="flex items-center gap-3 uppercase tracking-widest">
                    <Activity size={14} className="text-[#9d4edd]" /> Ray-Tracing_Cluster: 0.04mPa
                </div>
                <div className="flex items-center gap-3 uppercase tracking-widest">
                    <Zap size={14} className="text-[#22d3ee]" /> Render_Queue: NOMINAL
                </div>
            </div>
            <div className="flex items-center gap-8 shrink-0">
                <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block">Architectural Cinema Division v8.1 // Final Render Protocol</span>
                <div className="h-4 w-px bg-white/10 hidden lg:block" />
                <span className="font-black text-gray-400 uppercase tracking-widest leading-none">Metaventions_OS</span>
            </div>
        </div>
    </div>
  );
};

export default ImageGen;
