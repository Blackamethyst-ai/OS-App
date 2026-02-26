
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Target, Activity, Loader2, Cpu, Globe, Lock, GitBranch, Zap, Radio, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { retryGeminiRequest, getAI } from '../services/geminiService';
import { cn } from '../utils/cn';
import TacticalScanner from './TacticalScanner';

// Defined as a function to ensure THREE constants are initialized when needed
const getParallaxShader = () => ({
  uniforms: {
    uTexture: { value: null },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uIntensity: { value: 0.03 },
    uAspect: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec2 uMouse;
    uniform float uIntensity;
    uniform vec2 uAspect;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 uv = (vUv - 0.5) * uAspect + 0.5;
      
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
      }

      vec4 baseColor = texture2D(uTexture, uv);
      float luminance = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
      
      float depth = pow(luminance, 2.0);
      vec2 displacement = uMouse * uIntensity * depth;
      
      float r = texture2D(uTexture, uv - displacement * 1.1).r;
      float g = texture2D(uTexture, uv - displacement).g;
      float b = texture2D(uTexture, uv - displacement * 0.9).b;
      
      float specularMask = pow(1.0 - luminance, 4.0);
      float distToMouse = 1.0 - length(vUv - 0.5 - uMouse * 0.5);
      float spec = pow(max(distToMouse, 0.0), 12.0) * specularMask * 0.4;
      
      vec3 finalColor = vec3(r, g, b) + (spec * vec3(0.7, 0.8, 1.0));
      
      float scanline = sin(vUv.y * 800.0 + uTime * 2.0) * 0.01;
      finalColor += scanline;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

const ZenithPlane = ({ imageUrl }: { imageUrl: string }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const { viewport } = useThree();

  const scale = useMemo(() => [viewport.width, viewport.height, 1] as [number, number, number], [viewport.width, viewport.height]);

  const shader = useMemo(() => getParallaxShader(), []);

  const uniforms = useMemo(
    () => ({
      ...shader.uniforms,
      uTexture: { value: texture }
    }),
    [texture, shader]
  );

  useFrame((state) => {
    if (mesh.current) {
      const { x, y } = state.mouse;
      const mat = mesh.current.material as THREE.ShaderMaterial;

      const imageAspect = 16 / 9;
      const viewportAspect = viewport.width / viewport.height;

      if (viewportAspect > imageAspect) {
        mat.uniforms.uAspect.value.set(1.0, imageAspect / viewportAspect);
      } else {
        mat.uniforms.uAspect.value.set(viewportAspect / imageAspect, 1.0);
      }

      mat.uniforms.uMouse.value.x = THREE.MathUtils.lerp(mat.uniforms.uMouse.value.x, x, 0.05);
      mat.uniforms.uMouse.value.y = THREE.MathUtils.lerp(mat.uniforms.uMouse.value.y, y, 0.05);
      mat.uniforms.uTime.value = state.clock.elapsedTime;

      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, x * 0.02, 0.05);
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, -y * 0.02, 0.05);
    }
  });

  const Mesh = 'mesh' as any;
  const PlaneGeometry = 'planeGeometry' as any;
  const ShaderMaterial = 'shaderMaterial' as any;

  return (
    <Mesh ref={mesh} scale={scale} position={[0, 0, 0]}>
      <PlaneGeometry args={[1, 1]} />
      <ShaderMaterial
        args={[shader]}
        uniforms={uniforms}
        transparent={true}
      />
    </Mesh>
  );
};

const IntelRibbon = () => {
  const [intel, setIntel] = useState<string[]>(["INITIALIZING_HORIZON_SCAN...", "SYNCING_REAL_WORLD_VECTORS...", "DEPIN_NETWORK_NOMINAL..."]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchIntel = async () => {
      setIsUpdating(true);
      try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: "List the top 4 real-time technical or financial trends for Sovereign AI, GPU clusters, and DePIN infrastructure in early 2025. Terse, one-word or short phrase each. Separated by pipes.",
          config: { tools: [{ googleSearch: {} }] }
        }));
        if (response.text) {
          const items = response.text.split('|').map(s => s.trim()).filter(Boolean);
          if (items.length > 0) setIntel(items);
        }
      } catch (e) { console.warn("Intel Ribbon Error", e); }
      finally { setIsUpdating(false); }
    };

    fetchIntel();
    const interval = setInterval(fetchIntel, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-6 bg-black/60 backdrop-blur-xl border-b border-white/5 z-40 overflow-hidden flex items-center group/ribbon">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10" />

      <div className="flex items-center gap-4 px-6 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Globe size={10} className={cn("text-[#18E6FF]", isUpdating && "animate-spin")} />
          <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest">Reality_Grounded</span>
        </div>
        <div className="h-2 w-px bg-white/10" />
      </div>

      <motion.div
        animate={{ x: ['10%', '-100%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="whitespace-nowrap flex items-center gap-16 relative z-10"
      >
        {intel.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-[#9d4edd] shadow-[0_0_8px_#9d4edd]" />
            <span className="text-[9px] font-black font-mono text-white/40 uppercase tracking-[0.4em] group-hover/ribbon:text-white/80 transition-colors">{item}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const MONOLOGUES = [
  { agent: "PUCK", text: "Dreaming new architectural symmetries..." },
  { agent: "CHARON", text: "Auditing PARA integrity... 0.04ms" },
  { agent: "FENRIR", text: "Optimizing code execution latency." },
  { agent: "PUCK", text: "Synthesizing visual logic buffers." },
  { agent: "CHARON", text: "Security attestation level 0 confirmed." },
  { agent: "FENRIR", text: "Compiling strategic implementation deck." }
];

const AgentMonologues = () => {
  const [activeMonologue, setActiveMonologue] = useState<{ agent: string, text: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setActiveMonologue(MONOLOGUES[Math.floor(Math.random() * MONOLOGUES.length)]);
        setTimeout(() => setActiveMonologue(null), 4000);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {activeMonologue && (
          <motion.div
            initial={{ opacity: 0, x: 200, y: 300 }}
            animate={{
              opacity: [0, 0.4, 0.4, 0],
              x: [200, 150, 100, 50],
              y: [300, 290, 310, 300]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute text-right"
          >
            <div className="flex flex-col gap-1 pr-12">
              <span className="text-[7px] font-mono text-[#9d4edd] uppercase tracking-widest font-black">[{activeMonologue.agent}_MONOLOGUE]</span>
              <span className="text-[10px] font-mono text-white/20 italic tracking-tight uppercase whitespace-nowrap">{activeMonologue.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TacticalOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-20 p-12 flex flex-col justify-between overflow-hidden pt-16">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.01)_1px,transparent_1px)] bg-[size:50px_50px] opacity-40 pointer-events-none" />

    <div className="flex justify-between items-start">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 px-6 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-[#9d4edd]/50 rounded-2xl shadow-[0_0_40px_rgba(157,78,221,0.15)] pointer-events-auto cursor-pointer group/id"
        >
          <div className="relative">
            <ShieldCheck size={18} className="text-[#10b981] animate-pulse" />
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-[#10b981]/20" />
          </div>
          <span className="text-[11px] font-black text-white font-mono uppercase tracking-[0.5em] leading-none group-hover/id:text-[#10b981] transition-colors">Identity_Verified_L0</span>
        </motion.div>

        <div className="flex flex-col gap-4 pl-2 relative">
          <div className="absolute left-[-24px] top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-[#9d4edd] via-[#18E6FF] to-transparent opacity-40" />

          <motion.h2
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2 }}
            className="text-6xl font-black text-white font-mono tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)]"
          >
            Sovereign
            <br />
            <span className="text-[#9d4edd] [text-shadow:0_0_20px_rgba(157,78,221,0.5)]">Architect</span>
          </motion.h2>

          <div className="flex items-center gap-8 mt-4">
            <div className="flex items-center gap-3">
              <Cpu size={12} className="text-[#18E6FF]" />
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.6em] font-black drop-shadow-md">Core_Lattice_Authorized</span>
            </div>
            <div className="h-[1px] w-24 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-5">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="px-8 py-4 bg-black/70 border border-white/10 rounded-3xl flex items-center gap-6 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] pointer-events-auto cursor-pointer group/sync"
        >
          <div className="flex flex-col items-end gap-1">
            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest leading-none">Sync_Vector</span>
            <span className="text-11px font-mono text-[#18E6FF] font-black uppercase tracking-widest group-hover/sync:animate-pulse">Zenith_Active</span>
          </div>
          <Target size={22} className="text-[#18E6FF] animate-[spin_8s_linear_infinite]" />
        </motion.div>

        <div className="flex flex-col items-end gap-2 pr-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-[#9d4edd]"
              />
            ))}
          </div>
          <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.4em]">Handshake: OK</span>
        </div>
      </div>
    </div>

    <div className="flex justify-between items-end pb-4">
      <div className="flex gap-20 ml-2">
        <div className="space-y-2">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block opacity-60 font-black">Cluster_Node</span>
          <div className="flex items-center gap-3">
            <Globe size={14} className="text-gray-500" />
            <span className="text-base font-black font-mono text-white uppercase tracking-[0.2em]">Manhattan_01</span>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block opacity-60 font-black">Neural_Architecture</span>
          <div className="flex items-center gap-3">
            <GitBranch size={14} className="text-[#9d4edd]" />
            <span className="text-base font-black font-mono text-white uppercase tracking-[0.2em]">Recursive_Logic</span>
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col items-end gap-8 mr-2">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest font-black opacity-60 leading-none">System_Attestation</span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-black font-mono text-[#10b981] uppercase tracking-[0.2em]">Optimal_L0</span>
              <Lock size={12} className="text-[#10b981]" />
            </div>
          </div>
          <div className="w-4 h-4 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_20px_#10b981]" />
        </div>
      </div>
    </div>
  </div>
);

export const ZenithDisplay = ({ currentZenithImage }: { currentZenithImage: string }) => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto">
      {!currentZenithImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-2xl z-50">
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <Loader2 size={16} className="text-[#9d4edd] animate-spin" />
              <div className="absolute inset-0 blur-2xl bg-[#9d4edd]/30 rounded-full animate-pulse" />
            </div>
            <span className="text-[#9d4edd] font-mono text-xs animate-pulse tracking-[1em] uppercase font-black">Establishing_Zenith_Link...</span>
          </div>
        </div>
      )}

      {currentZenithImage && (
        <div className="w-full h-full relative group/zenith">
          <IntelRibbon />
          <TacticalOverlay />
          <AgentMonologues />
          <TacticalScanner />

          <Canvas
            camera={{ position: [0, 0, 5], fov: 40 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            className="absolute inset-0 w-full h-full z-10"
          >
            <React.Suspense fallback={null}>
              <ZenithPlane imageUrl={currentZenithImage} />
            </React.Suspense>
          </Canvas>

          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] z-20" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-20 mix-blend-overlay" />

          <motion.div
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] bg-white/5 z-20 pointer-events-none"
          />
        </div>
      )}
    </div>
  );
};
