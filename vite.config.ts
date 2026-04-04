import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isProductionBuild = mode === 'production';
  const isBuild = command === 'build';

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: true,
      },
      headers: {
        'Alt-Svc': 'h3=":443"; ma=86400',
        'Link': '</src/main.tsx>; rel=preload; as=script',
      },
      warmup: {
        clientFiles: [
          './src/App.tsx',
          './src/components/routing/AppRoutes.tsx',
          './src/components/erp/ERPModularDashboard.tsx',
          './src/layouts/DashboardLayout.tsx',
        ],
      },
    },
    plugins: [
      react({
        // SWC optimizations
        jsxImportSource: undefined,
      }), 
      !isBuild && mode === "development" && componentTagger(),
      // PWA only in production builds to reduce build-time memory in development mode
      mode === "production" && VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'brain-logo.png', 'robots.txt'],
        manifest: {
          name: 'ObelixIA - CRM Bancario Inteligente',
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
              name: 'Mi Portal RRHH',
              short_name: 'Mi Portal',
              url: '/mi-portal',
              description: 'Portal del empleado - nóminas, solicitudes, fichaje',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
            },
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
                  maxAgeSeconds: 60 * 60 * 24,
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
                  maxAgeSeconds: 60 * 60 * 24 * 365,
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
                  maxAgeSeconds: 60 * 60 * 24 * 365,
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
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        },
        devOptions: {
          enabled: false,
        },
      }),
      mode === "production" && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        compressionOptions: {
          params: {
            0: 11,
          },
        },
        deleteOriginFile: false,
        verbose: true,
        filter: /\.(js|mjs|json|css|html|svg|xml|woff|woff2|ttf|eot)$/i,
      }),
      mode === "production" && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        compressionOptions: {
          level: 9,
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
      rollupOptions: {
        maxParallelFileOps: isProductionBuild ? 2 : 1,
        output: {
          manualChunks: isProductionBuild ? (id) => {
            if (id.includes('node_modules/react-dom')) return 'vendor-react-dom';
            if (id.includes('node_modules/react-router')) return 'vendor-router';
            if (id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) return 'vendor-react';
            if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
            if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts';
            if (id.includes('node_modules/@tanstack')) return 'vendor-query';
            if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
            if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/mapbox-gl')) return 'vendor-map';
            if (id.includes('node_modules/date-fns')) return 'vendor-date';
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            if (id.includes('node_modules')) return 'vendor-misc';

            // Production — granular splitting
            if (id.includes('/components/galia/phase4/')) return 'app-galia-p4';
            if (id.includes('/components/galia/phase5/')) return 'app-galia-p5';
            if (id.includes('/components/galia/phase6/')) return 'app-galia-p6';
            if (id.includes('/components/galia/phase7/')) return 'app-galia-p7';
            if (id.includes('/components/galia/phase8/')) return 'app-galia-p8';
            if (id.includes('/components/galia/phase9/')) return 'app-galia-p9';
            if (id.includes('/components/galia/')) return 'app-galia-misc';
            if (id.includes('/verticals/galia/')) return 'app-galia-verticals';
            if (id.includes('/components/erp/accounting/')) return 'app-erp-accounting';
            if (id.includes('/components/erp/fiscal/')) return 'app-erp-fiscal';
            if (id.includes('/components/erp/sales/')) return 'app-erp-sales';
            if (id.includes('/components/erp/purchases/')) return 'app-erp-purchases';
            if (id.includes('/components/erp/trade/')) return 'app-erp-trade';
            if (id.includes('/components/erp/hr/')) return 'app-erp-hr';
            if (id.includes('/components/erp/logistics/')) return 'app-erp-logistics';
            if (id.includes('/components/erp/treasury/')) return 'app-erp-treasury';
            if (id.includes('/components/erp/inventory/')) return 'app-erp-inventory';
            if (id.includes('/components/erp/audit-center/')) return 'app-erp-audit-center';
            if (id.includes('/components/erp/ai-center/')) return 'app-erp-ai-center';
            if (id.includes('/components/erp/')) return 'app-erp-misc';
            if (id.includes('/components/admin/')) return 'app-admin';
            if (id.includes('/components/academia/')) return 'app-academia';
          } : undefined,
          compact: isProductionBuild,
          generatedCode: {
            arrowFunctions: true,
            constBindings: true,
            objectShorthand: true,
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
        treeshake: isProductionBuild
          ? {
              moduleSideEffects: false,
            }
          : false,
      },
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: isProductionBuild,
      target: 'esnext',
      assetsInlineLimit: 2048,
      modulePreload: {
        polyfill: false,
      },
      reportCompressedSize: false,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      exclude: ['maplibre-gl', 'mapbox-gl'],
      esbuildOptions: {
        target: 'esnext',
        treeShaking: true,
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
    },
    css: {
      devSourcemap: !isBuild,
      modules: {
        localsConvention: 'camelCase',
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
      headers: {
        'Alt-Svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    json: {
      stringify: false,
    },
    envPrefix: 'VITE_',
    esbuild: {
      legalComments: 'none',
      treeShaking: true,
      target: 'esnext',
      pure: mode === 'production' ? ['console.log', 'console.debug', 'console.trace'] : [],
    },
  };
});
