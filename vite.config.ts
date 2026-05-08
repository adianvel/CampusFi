import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'inject-process-polyfill',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [{
              tag: 'script',
              children: `
                window.process = window.process || {
                  env: {},
                  browser: true,
                  version: "",
                  versions: { node: "" },
                  nextTick: function(fn) { return Promise.resolve().then(fn); },
                  cwd: function() { return "/"; },
                  platform: "browser",
                };
                window.global = window.global || window;
                window.Buffer = window.Buffer || undefined;
              `,
              injectTo: 'head-prepend',
            }];
          },
        },
      },
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream', 'crypto', 'events', 'os'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['buffer', 'process', 'util', 'stream-browserify', 'events', 'crypto-browserify'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        banner: {
          js: '(function(){var p=globalThis.process||{};p.version=p.version||"";p.browser=true;p.env=p.env||{};p.nextTick=p.nextTick||function(fn){Promise.resolve().then(fn)};p.cwd=p.cwd||function(){return"/"};p.platform=p.platform||"browser";globalThis.process=p;globalThis.global=globalThis.global||globalThis})();',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
