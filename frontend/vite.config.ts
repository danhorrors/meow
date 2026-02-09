import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), svgrPlugin()],
  server: {
    port: 3000,
  },
  build: {
    outDir: './build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/@adobe/react-spectrum/') ||
            id.includes('/@react-aria/') ||
            id.includes('/@react-stately/') ||
            id.includes('/@react-types/') ||
            id.includes('/@internationalized/')
          ) {
            return 'spectrum-vendor';
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/react-redux/') ||
            id.includes('/redux/') ||
            id.includes('/@reduxjs/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'charts-vendor';
          }

          if (id.includes('/react-beautiful-dnd/')) {
            return 'dnd-vendor';
          }

          if (id.includes('/luxon/')) {
            return 'date-vendor';
          }

          return 'misc-vendor';
        },
      },
    },
  },
});
