import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

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
    plugins: [
      react(),
      {
        name: 'strip-importmap',
        transformIndexHtml(html, ctx) {
          if (ctx.bundle) {
            // Production: keep only mermaid (externalized via rollupOptions)
            return html.replace(
              /<script type="importmap">[\s\S]*?<\/script>/,
              `<script type="importmap">\n{"imports":{"mermaid":"https://esm.sh/mermaid@^11.12.2"}}\n</script>`
            );
          }
          return html;
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'Metaventions AI',
          short_name: 'Metaventions',
          description: 'Sovereign AI Platform',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
      }),
    ],
    // Enable SPA support for deployments like Vercel
    appType: 'spa',
    define: {},
    resolve: {
      alias: {
        '@': rootPath,
        'libs': path.resolve('libs'),
      }
    },
    build: {
      chunkSizeWarningLimit: 2000,
      // Prevent heavy visualization chunks from being modulepreloaded in index.html.
      // They are code-split into separate chunks and should only load on demand.
      modulePreload: {
        resolveDependencies: (filename, deps, { hostId, hostType }) => {
          const lazyChunkPatterns = [
            'vendor-recharts', 'vendor-redux', 'vendor-d3',
            'vendor-three', 'vendor-faceapi', 'vendor-tensorflow',
            'vendor-onnx', 'vendor-xyflow', 'vendor-katex',
            'vendor-cytoscape',
          ];
          return deps.filter(dep =>
            !lazyChunkPatterns.some(pattern => dep.includes(pattern))
          );
        },
      },
      // Strip console.log and debugger in production
      minify: 'esbuild',
      ...(mode === 'production' && {
        esbuild: {
          drop: ['console', 'debugger'],
        },
      }),
      rollupOptions: {
        external: ['mermaid'],
        output: {
          globals: {
            mermaid: 'mermaid'
          },
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Heavy ML/3D libs — lazy-loaded, separate chunks
              if (id.includes('three')) return 'vendor-three';
              if (id.includes('face-api')) return 'vendor-faceapi';
              if (id.includes('@tensorflow')) return 'vendor-tensorflow';
              if (id.includes('onnxruntime')) return 'vendor-onnx';

              // Chart/visualization libs
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('cytoscape')) return 'vendor-cytoscape';
              if (id.includes('d3')) return 'vendor-d3';
              if (id.includes('@xyflow')) return 'vendor-xyflow';
              if (id.includes('katex')) return 'vendor-katex';

              // Animation/UI libs
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-lucide';

              // AI/API libs
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('@supabase')) return 'vendor-supabase';

              // Redux (recharts internal dep)
              if (id.includes('@reduxjs') || id.includes('redux')) return 'vendor-redux';

              // Core React + ecosystem — keep together to avoid circular deps
              // (scheduler, react-dom internals, zustand all depend on react)
              if (id.includes('react') || id.includes('zustand') || id.includes('scheduler') || id.includes('use-sync-external-store')) return 'vendor-react';

              // Let Vite handle remaining vendor splitting automatically
              // (removing catch-all 'vendor' prevents circular chunk deps)
            }

            // App-level service splitting — reduce main entry chunk
            const appRoot = rootPath + '/';
            if (id.includes('geminiService')) console.log('[CHUNK-DEBUG] gemini id:', id);
            if (id.includes('store') && !id.includes('node_modules') && !id.includes('external-store')) console.log('[CHUNK-DEBUG] store id:', id);
            if (id.startsWith(appRoot)) {
              const rel = id.slice(appRoot.length);
              if (rel.startsWith('services/organisms/')) return 'app-organisms';
              if (rel.startsWith('services/voiceNexus/')) return 'app-voice';
              if (rel.startsWith('services/kernel/')) return 'app-kernel';
              // Capabilities sub-chunks (was single 985KB app-capabilities)
              if (rel.startsWith('services/capabilities/adapters/')) return 'app-capabilities-adapters';
              if (rel.startsWith('services/capabilities/providers/')) return 'app-capabilities-providers';
              if (rel === 'services/capabilities/cpb.ts') return 'app-capabilities-cpb';
              if (rel === 'services/capabilities/registry.ts' || rel === 'services/capabilities/types.ts') return 'app-capabilities-registry';
              if (rel.startsWith('services/capabilities/')) return 'app-capabilities';
              // Actions sub-chunks by handler type
              if (rel.startsWith('services/actions/handlers/sovereign.ts')) return 'app-actions-sovereign';
              if (rel.startsWith('services/actions/handlers/generation.ts')) return 'app-actions-generation';
              if (rel.startsWith('services/actions/handlers/analysis.ts')) return 'app-actions-analysis';
              if (rel.startsWith('services/actions/handlers/')) return 'app-actions-handlers';
              if (rel.startsWith('services/actions/')) return 'app-actions';
              // Heavy shared services — isolate so they don't inflate consumer chunks
              if (rel === 'services/geminiService.ts') return 'app-gemini';
              if (rel === 'store.ts') return 'app-store';
              if (rel.startsWith('services/archon/')) return 'app-archon';
              if (rel.startsWith('services/cognitivePrecisionBridge/')) return 'app-cpb';
              if (rel.startsWith('services/ui/')) return 'app-ui';
              if (rel.startsWith('services/memory/')) return 'app-memory';
            }
          },
        },
      },
    },
  };
});