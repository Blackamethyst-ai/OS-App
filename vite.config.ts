import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Resolve @ to the current working directory
  const rootPath = path.resolve('.');

  return {
    server: {
      port: 5173,
      strictPort: false,
      host: '0.0.0.0',
      // SPA Fallback for local development
      historyApiFallback: true,
    },
    plugins: [react()],
    // Enable SPA support for deployments like Vercel
    appType: 'spa',
    define: {
      // Support both VITE_GEMINI_API_KEY and legacy GEMINI_API_KEY from .env
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': rootPath,
        'libs': path.resolve('libs'),
      }
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rolldownOptions: {
        external: ['mermaid'],
        output: {
          globals: {
            mermaid: 'mermaid'
          },
          // Strip console.log and debugger in production
          ...(mode === 'production' && {
            minify: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              }
            }
          }),
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) {
                return 'vendor-three';
              }
              if (id.includes('face-api')) {
                return 'vendor-faceapi';
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('@xyflow')) {
                return 'vendor-xyflow';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              if (id.includes('@tensorflow')) {
                return 'vendor-tensorflow';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});