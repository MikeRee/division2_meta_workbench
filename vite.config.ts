import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/division2_meta_workbench/',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.WORKER_1),
    cors: true,
    proxy: {
      '/api/sheets': {
        target: 'https://sheets.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sheets/, ''),
        secure: true,
      },
    },
  },
});
