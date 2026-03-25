import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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
            if (id.startsWith(appRoot)) {
              const rel = id.slice(appRoot.length);
              if (rel.startsWith('services/organisms/')) return 'app-organisms';
              if (rel.startsWith('services/voiceNexus/')) return 'app-voice';
              if (rel.startsWith('services/kernel/')) return 'app-kernel';
              if (rel.startsWith('services/capabilities/') || rel.startsWith('services/actions/')) return 'app-capabilities';
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