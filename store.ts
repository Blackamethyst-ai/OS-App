

import { create } from 'zustand';
import { AppMode, ProcessState, ImageGenState, AspectRatio, ImageSize, DashboardState, BibliomorphicState, HardwareState, VoiceState, CodeStudioState, GlobalSearchState } from './types';

interface AppState {
  mode: AppMode;
  process: ProcessState;
  imageGen: ImageGenState;
  dashboard: DashboardState;
  bibliomorphic: BibliomorphicState;
  hardware: HardwareState;
  voice: VoiceState;
  codeStudio: CodeStudioState;
  search: GlobalSearchState; // Added Search State
  isCommandPaletteOpen: boolean;
  
  setMode: (mode: AppMode) => void;
  setProcessState: (update: Partial<ProcessState> | ((prev: ProcessState) => Partial<ProcessState>)) => void;
  setImageGenState: (update: Partial<ImageGenState> | ((prev: ImageGenState) => Partial<ImageGenState>)) => void;
  setDashboardState: (update: Partial<DashboardState> | ((prev: DashboardState) => Partial<DashboardState>)) => void;
  setBibliomorphicState: (update: Partial<BibliomorphicState> | ((prev: BibliomorphicState) => Partial<BibliomorphicState>)) => void;
  setHardwareState: (update: Partial<HardwareState> | ((prev: HardwareState) => Partial<HardwareState>)) => void;
  setVoiceState: (update: Partial<VoiceState> | ((prev: VoiceState) => Partial<VoiceState>)) => void;
  setCodeStudioState: (update: Partial<CodeStudioState> | ((prev: CodeStudioState) => Partial<CodeStudioState>)) => void;
  setSearchState: (update: Partial<GlobalSearchState> | ((prev: GlobalSearchState) => Partial<GlobalSearchState>)) => void;
  toggleCommandPalette: (isOpen?: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: AppMode.DASHBOARD,
  isCommandPaletteOpen: false,
  process: {
    prompt: '',
    governance: {
        targetSystem: '',
        constraintLevel: 'Standard',
        outputTopology: 'Hierarchical',
        additionalDirectives: ''
    },
    artifacts: [],
    isLoading: false,
    generatedCode: '',
    chatHistory: [],
    audioUrl: null,
    error: null,
    autopoieticFramework: null
  },
  imageGen: {
    prompt: '',
    aspectRatio: AspectRatio.RATIO_1_1,
    size: ImageSize.SIZE_1K,
    generatedImage: null,
    isLoading: false,
    error: null
  },
  dashboard: {
    identityUrl: null,
    referenceImage: null,
    isGenerating: false
  },
  bibliomorphic: {
    dna: null,
    activeBook: null,
    library: [],
    libraryFiles: [],
    chatHistory: [],
    isLoading: false,
    error: null
  },
  hardware: {
    schematicImage: null,
    analysis: null,
    componentQuery: '',
    recommendations: [],
    isLoading: false,
    error: null
  },
  voice: {
    isActive: false,
    isConnecting: false,
    voiceName: 'Kore',
    volume: 0,
    transcripts: [],
    error: null
  },
  codeStudio: {
    prompt: '',
    generatedCode: null,
    language: 'typescript',
    isLoading: false,
    isExecuting: false,
    executionOutput: null,
    error: null,
    history: []
  },
  search: {
    query: '',
    results: [],
    isSearching: false,
    isOpen: false
  },
  
  setMode: (mode) => set({ mode }),
  
  setProcessState: (update) => set((state) => ({ 
    process: { ...state.process, ...(typeof update === 'function' ? update(state.process) : update) } 
  })),
  
  setImageGenState: (update) => set((state) => ({ 
    imageGen: { ...state.imageGen, ...(typeof update === 'function' ? update(state.imageGen) : update) } 
  })),

  setDashboardState: (update) => set((state) => ({ 
    dashboard: { ...state.dashboard, ...(typeof update === 'function' ? update(state.dashboard) : update) } 
  })),

  setBibliomorphicState: (update) => set((state) => ({ 
    bibliomorphic: { ...state.bibliomorphic, ...(typeof update === 'function' ? update(state.bibliomorphic) : update) } 
  })),

  setHardwareState: (update) => set((state) => ({ 
    hardware: { ...state.hardware, ...(typeof update === 'function' ? update(state.hardware) : update) } 
  })),

  setVoiceState: (update) => set((state) => ({ 
    voice: { ...state.voice, ...(typeof update === 'function' ? update(state.voice) : update) } 
  })),

  setCodeStudioState: (update) => set((state) => ({ 
    codeStudio: { ...state.codeStudio, ...(typeof update === 'function' ? update(state.codeStudio) : update) } 
  })),

  setSearchState: (update) => set((state) => ({ 
    search: { ...state.search, ...(typeof update === 'function' ? update(state.search) : update) } 
  })),
  
  toggleCommandPalette: (isOpen) => set((state) => ({ 
    isCommandPaletteOpen: isOpen !== undefined ? isOpen : !state.isCommandPaletteOpen 
  })),

  reset: () => set({ 
      // Reset logic can be customized
  })
}));