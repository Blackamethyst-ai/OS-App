/**
 * GENERATION ACTION HANDLERS
 * Image, video, and code generation actions.
 */

import { useAppStore } from '../../../store';
import { AspectRatio, ImageSize } from '../../../types';
import * as gemini from '../../geminiService';
import { audio } from '../../audioService';
import type { UnifiedAction } from '../types';

export const GENERATION_ACTIONS: UnifiedAction[] = [
  // ==========================================================================
  // IMAGE GENERATION
  // ==========================================================================
  {
    id: 'imagegen_generate_single',
    description: 'Generate a single image from prompt',
    handler: async (args) => {
      const store = useAppStore.getState();
      const prompt = (args.prompt || args.text || store.imageGen.prompt) as string;

      if (!prompt) {
        return { success: false, error: 'No prompt provided' };
      }

      try {
        const aspectRatio = (args.aspectRatio as AspectRatio) || store.imageGen.aspectRatio || AspectRatio.RATIO_16_9;
        const quality = (args.quality as ImageSize) || store.imageGen.quality || ImageSize.SIZE_2K;
        const result = await gemini.generateArchitectureImage(
          prompt,
          aspectRatio,
          quality,
          null
        );
        audio.playSuccess();
        return { success: true, imageUrl: result };
      } catch (e: any) {
        audio.playError();
        return { success: false, error: e.message };
      }
    },
    sectors: ['IMAGE_GEN', 'CINEMA'],
    priority: 85,
    executionPath: 'direct',
    complexity: 'architecture',
    source: 'component',
    examples: ['generate an image of a futuristic city', 'create a portrait'],
  },
  {
    id: 'imagegen_generate_video',
    description: 'Generate a video from prompt',
    handler: async (args) => {
      const prompt = (args.prompt || args.text) as string;
      if (!prompt) return { success: false, error: 'No prompt provided' };

      try {
        const result = await gemini.generateVideo(prompt);
        audio.playSuccess();
        return { success: true, videoUrl: result };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    sectors: ['IMAGE_GEN', 'CINEMA'],
    priority: 80,
    executionPath: 'ace',
    complexity: 'architecture',
    source: 'component',
    examples: ['generate a video of waves crashing', 'create an animation'],
  },
  {
    id: 'imagegen_set_prompt',
    description: 'Set the image generation prompt',
    handler: async (args) => {
      const { setImageGenState } = useAppStore.getState().actions;
      const prompt = (args.prompt || args.text) as string;
      setImageGenState({ prompt });
      return { success: true, prompt };
    },
    sectors: ['IMAGE_GEN'],
    priority: 70,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'imagegen_set_aspect_ratio',
    description: 'Set image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)',
    handler: async (args) => {
      const { setImageGenState } = useAppStore.getState().actions;
      const ratioStr = (args.ratio || args.aspectRatio || '16:9') as string;
      const aspectRatio = ratioStr as AspectRatio;
      setImageGenState({ aspectRatio });
      return { success: true, aspectRatio };
    },
    sectors: ['IMAGE_GEN'],
    priority: 65,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'imagegen_set_quality',
    description: 'Set image quality (low, medium, high)',
    handler: async (args) => {
      const { setImageGenState } = useAppStore.getState().actions;
      const qualityStr = (args.quality || 'high') as string;
      const quality = qualityStr as ImageSize;
      setImageGenState({ quality });
      return { success: true, quality };
    },
    sectors: ['IMAGE_GEN'],
    priority: 65,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },

  // ==========================================================================
  // CODE GENERATION
  // ==========================================================================
  {
    id: 'codestudio_generate',
    description: 'Generate code from a natural language prompt',
    handler: async (args) => {
      const prompt = (args.prompt || args.text || args.description) as string;
      if (!prompt) return { success: false, error: 'No prompt provided' };

      try {
        const result = await gemini.generateCode(prompt, (args.language as string) || 'typescript');
        audio.playSuccess();
        return { success: true, code: result };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    sectors: ['CODE_STUDIO', 'LOGIC'],
    priority: 85,
    executionPath: 'ace',
    complexity: 'architecture',
    source: 'component',
    examples: ['generate a React component', 'write a sorting algorithm'],
  },
  {
    id: 'codestudio_explain',
    description: 'Explain what a piece of code does',
    handler: async (args) => {
      const code = (args.code || args.text) as string;
      if (!code) return { success: false, error: 'No code provided' };

      try {
        // Use generateContent with a code explanation prompt
        const explanation = await gemini.generateText(`Explain this code:\n\n${code}`);
        return { success: true, explanation };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    sectors: ['CODE_STUDIO'],
    priority: 75,
    executionPath: 'rlm',
    complexity: 'analysis',
    source: 'component',
  },
  {
    id: 'codestudio_refactor',
    description: 'Refactor code for better quality',
    handler: async (args) => {
      const code = (args.code || args.text) as string;
      if (!code) return { success: false, error: 'No code provided' };

      try {
        // Use generateCode with refactoring instructions
        const instructions = (args.instructions as string) || 'Refactor for better quality and readability';
        const result = await gemini.generateCode(`${instructions}:\n\n${code}`, 'typescript');
        audio.playSuccess();
        return { success: true, refactoredCode: result };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    sectors: ['CODE_STUDIO'],
    priority: 80,
    executionPath: 'ace',
    complexity: 'architecture',
    source: 'component',
  },

  // ==========================================================================
  // GENERAL GENERATION
  // ==========================================================================
  {
    id: 'generate_text',
    description: 'Generate text content from a prompt',
    handler: async (args) => {
      const prompt = (args.prompt || args.text) as string;
      if (!prompt) return { success: false, error: 'No prompt provided' };

      try {
        const result = await gemini.generateText(prompt);
        return { success: true, content: result };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    sectors: [],
    priority: 70,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'voice',
    examples: ['write a summary', 'generate a description'],
  },
];
