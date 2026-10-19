import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import fs from 'node:fs';
import { resolve } from 'node:path';

/**
 * Emits a 404.html next to index.html so that deep links such as /patients or
 * /scan keep working on static hosts (GitHub Pages, S3, plain nginx) that do
 * not rewrite unknown paths to index.html.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      const indexPath = resolve(outDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, resolve(outDir, '404.html'));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // `npm run dev:https` serves the app over a self signed certificate so
      // that phones on the same network can use the camera (getUserMedia
      // requires a secure context).
      ...(mode === 'https' ? [basicSsl()] : []),
      spaFallback(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
