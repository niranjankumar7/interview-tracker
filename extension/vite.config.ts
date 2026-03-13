import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        manifest: resolve(__dirname, 'src/manifest.json'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'background/[name].js';
          }
          if (chunkInfo.name === 'content-script') {
            return 'content/[name].js';
          }
          return '[name]/[name].js';
        },
        chunkFileNames: 'shared/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.css$/i.test(assetInfo.name)) {
            return 'popup/[name][extname]';
          }
          if (/\.html$/i.test(assetInfo.name)) {
            return 'popup/[name][extname]';
          }
          if (/\.json$/i.test(assetInfo.name)) {
            return '[name][extname]';
          }
          if (/\.png$/i.test(assetInfo.name)) {
            return 'icons/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
});
