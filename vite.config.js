import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        // The upstream single-file HTML relied on Babel Standalone's env preset,
        // which lowered block-scoped declarations. Preserve that behavior while
        // the legacy app is being split into smaller modules.
        plugins: ['@babel/plugin-transform-block-scoping']
      }
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 8765
  },
  preview: {
    host: '127.0.0.1',
    port: 8765
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/lucide/')) return 'icons';
          if (id.includes('/dompurify/') || id.includes('/marked/')) return 'markdown';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          return 'vendor';
        }
      }
    }
  }
});
