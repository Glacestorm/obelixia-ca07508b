import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Vite 6: Improved HMR
    hmr: {
      overlay: true,
    },
    // HTTP/3 preparation headers
    headers: {
      'Alt-Svc': 'h3=":443"; ma=86400',
      'Link': '</src/main.tsx>; rel=preload; as=script',
    },
  },
  plugins: [
    react({
      // SWC optimizations
      jsxImportSource: undefined,
    }), 
    mode === "development" && componentTagger(),
    // PWA Configuration for Offline Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'brain-logo.png', 'robots.txt'],
      manifest: {
        name: 'ObelixIA - CRM Bancario Inteligente',
        short_name: 'ObelixIA',
        description: 'Plataforma CRM bancaria con IA para gestión comercial, GALIA y análisis financiero',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: '/dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'GALIA',
            short_name: 'GALIA',
            url: '/galia',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/avaugfnqvvqcilhiudlf\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Brotli Compression Level 11 - Maximum compression for static assets
    mode === "production" && viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
      compressionOptions: {
        params: {
          // Brotli quality level 11 (maximum compression)
          0: 11, // BROTLI_PARAM_QUALITY = 11
        },
      },
      deleteOriginFile: false, // Keep original files
      verbose: true,
      filter: /\.(js|mjs|json|css|html|svg|xml|woff|woff2|ttf|eot)$/i,
    }),
    // Gzip fallback for older browsers
    mode === "production" && viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      compressionOptions: {
        level: 9, // Maximum gzip compression
      },
      deleteOriginFile: false,
      verbose: true,
      filter: /\.(js|mjs|json|css|html|svg|xml)$/i,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Core Web Vitals Optimizations - Vite 6 enhancements
  build: {
    // MEMORY OPTIMIZATION: Limit parallel file operations
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react-dom')) return 'vendor-react-dom';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) return 'vendor-react';
          
          // Heavy UI libraries - split granularly
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts';
          
          // Data/State
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          
          // Map libraries
          if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/mapbox-gl')) return 'vendor-map';
          
          // Utilities
          if (id.includes('node_modules/date-fns')) return 'vendor-date';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/zod')) return 'vendor-zod';
          
          // App code splitting by domain
          if (id.includes('/components/galia/')) return 'app-galia';
          if (id.includes('/components/admin/')) return 'app-admin';
          if (id.includes('/components/verticals/')) return 'app-verticals';
          // Academia: split by subdirectory to avoid huge single chunk
          if (id.includes('/components/academia/dashboard/')) return 'app-academia-dashboard';
          if (id.includes('/components/academia/strategy/')) return 'app-academia-strategy';
          if (id.includes('/components/academia/structure/')) return 'app-academia-structure';
          if (id.includes('/components/academia/production/')) return 'app-academia-production';
          if (id.includes('/components/academia/business/')) return 'app-academia-business';
          if (id.includes('/components/academia/marketing/')) return 'app-academia-marketing';
          if (id.includes('/components/academia/gamification/')) return 'app-academia-gamification';
          if (id.includes('/components/academia/adaptive-quiz/')) return 'app-academia-quiz';
          if (id.includes('/components/academia/learning-path/')) return 'app-academia-lpath';
          if (id.includes('/components/academia/learning-player/')) return 'app-academia-player';
          if (id.includes('/components/academia/')) return 'app-academia-misc';
          
          // Remaining node_modules
          if (id.includes('node_modules')) return 'vendor-misc';
        },
        // Aggressive tree-shaking configuration
        compact: true,
        generatedCode: {
          arrowFunctions: true,
          constBindings: true,
          objectShorthand: true,
        },
        // Simplified chunk naming to reduce memory
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      // Tree-shaking optimization - less aggressive to reduce memory
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    // Minification for smaller bundle sizes
    minify: 'esbuild',
    // MEMORY: Disable source maps during build
    sourcemap: false,
    // Increase chunk warning limit
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Smaller inline limit
    assetsInlineLimit: 2048,
    // Module preload polyfill disabled
    modulePreload: {
      polyfill: false,
    },
    // MEMORY: Disable compressed size reporting
    reportCompressedSize: false,
  },
  // Optimize dependencies - reduced set for memory
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    // Exclude heavy deps from pre-bundling
    exclude: ['maplibre-gl', 'mapbox-gl'],
    esbuildOptions: {
      target: 'esnext',
      treeShaking: true,
      // Only drop console in production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  },
  // Enable CSS optimization
  css: {
    devSourcemap: true,
    // Vite 6: CSS modules optimization
    modules: {
      localsConvention: 'camelCase',
    },
  },
  // Vite 6: Improved preview server with HTTP/3 hints
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'Alt-Svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  // MEMORY: Disable JSON stringify (reduces memory during build)
  json: {
    stringify: false,
  },
  // Vite 6: Environment handling
  envPrefix: 'VITE_',
  // esbuild optimization for tree-shaking
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
    target: 'esnext',
    // Remove dead code paths
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.trace'] : [],
  },
}));
