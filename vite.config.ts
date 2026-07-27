import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Chunks that must never load until something actually needs them.
 *
 * Used twice, and the two uses have to agree: they are stripped from the
 * modulepreload graph in index.html, AND excluded from the service worker's
 * precache. Getting only the first half right is what happened before — the
 * preload list was carefully curated while the SW, having no workbox config,
 * fell back to precaching everything and pulled all 7.2MB down on install.
 * That silently undid the code splitting for exactly the users the PWA is
 * meant to serve.
 *
 * These are still cached, just on demand — see runtimeCaching below.
 */
const LAZY_CHUNK_PATTERNS = [
  'vendor-recharts', 'vendor-redux', 'vendor-d3',
  'vendor-three', 'vendor-faceapi', 'vendor-tensorflow',
  'vendor-onnx', 'vendor-xyflow', 'vendor-katex',
  'vendor-cytoscape', 'vendor-mermaid',
];

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
      tailwindcss(),
      react(),
      {
        name: 'strip-importmap',
        transformIndexHtml(html, ctx) {
          if (ctx.bundle) {
            // Production resolves every dependency through the bundle, so the
            // dev importmap is dropped entirely. It used to survive with a
            // mermaid entry pointing at esm.sh — the one runtime dependency
            // the lockfile did not pin, fetched from a third party into the
            // app's own origin, at a floating ^11.12.2 that could and did
            // differ from the 11.16.0 the app was built and typechecked
            // against. It also broke every diagram offline, in an app that
            // markets itself local-first. Mermaid is bundled now.
            return html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
          }
          return html;
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        workbox: {
          // Precache the app shell only. Without this block the default glob
          // swept up every chunk and every face-api model weight — 91 entries,
          // 7.2MB downloaded on install before the user had done anything.
          // Icons are matched at the root only, not recursively: a recursive
          // png glob also swallows public/anchor-library/seed/, which is
          // gitignored local reference photos running to tens of MB.
          globPatterns: ['**/*.{js,css,html,webmanifest}', '*.{svg,png,ico}'],
          globIgnores: [
            '**/node_modules/**/*',
            'sw.js',
            'workbox-*.js',
            // Local-only reference imagery; never part of a deploy.
            'anchor-library/**/*',
            // Deliberately lazy — fetched and cached on first real use.
            ...LAZY_CHUNK_PATTERNS.map(p => `**/assets/${p}*.js`),
            // face-api weights: ~13MB of shards nobody needs unless they
            // open the biometric panel. Runtime-cached below.
            'models/**/*',
          ],
          runtimeCaching: [
            {
              // Content-hashed chunk filenames, so CacheFirst is safe:
              // a changed build produces a new URL rather than stale content.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'lazy-chunks',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Biometric model weights — large, immutable, rarely used.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith('/models/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'face-models',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
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
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
      }),
      // Opt-in only: ANALYZE=1 npm run build
      //
      // This ran unconditionally and wrote a 2MB dist/stats.html that shipped
      // with every deploy. It was live and publicly readable at
      // /stats.html on production — a full interactive map of the internal
      // module graph, listing every source file path, every dependency and
      // their sizes. It was also being precached by the service worker, so
      // every PWA install downloaded it.
      ...(env.ANALYZE
        ? [visualizer({ filename: 'dist/stats.html', gzipSize: true })]
        : []),
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
          return deps.filter(dep =>
            !LAZY_CHUNK_PATTERNS.some(pattern => dep.includes(pattern))
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
        output: {
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
              // Only reached via the lazy MermaidDiagram route, so its own
              // chunk keeps it off the first-paint path.
              //
              // The transitive deps must be listed explicitly. Matching only
              // 'mermaid' leaves langium/chevrotain/dagre/roughjs to fall
              // through to Vite's automatic splitting, which lands them in
              // chunks that ARE precached — quietly putting ~500KB of a lazy
              // feature's dependencies back into the install payload.
              if (
                id.includes('mermaid') ||
                id.includes('langium') ||
                id.includes('chevrotain') ||
                id.includes('dagre-d3-es') ||
                id.includes('roughjs') ||
                id.includes('khroma') ||
                id.includes('dompurify') ||
                id.includes('stylis') ||
                id.includes('ts-dedent') ||
                id.includes('@braintree/sanitize-url') ||
                id.includes('@upsetjs') ||
                id.includes('d3-sankey') ||
                id.includes('@iconify/utils')
              ) return 'vendor-mermaid';

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
              // Capabilities — lightweight registry + types (actions are lazy-loaded)
              if (rel.startsWith('services/capabilities/')) return 'app-capabilities';
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