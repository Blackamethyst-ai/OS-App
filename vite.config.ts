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
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': rootPath,
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          external: ['mermaid'],
          output: {
            globals: {
              mermaid: 'mermaid'
            },
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('recharts')) {
                  return 'vendor-recharts';
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-framer';
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
                return 'vendor';
              }
            },
          },
        },
      },
    };
});