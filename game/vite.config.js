import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');

          if (normalizedId.includes('/node_modules/three/')) return 'three-vendor';
          if (normalizedId.includes('/node_modules/@react-three/fiber/')) return 'r3f-vendor';
          return undefined;
        },
      },
    },
  },
});
