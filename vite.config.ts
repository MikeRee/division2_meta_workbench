import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTimestamp = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-build-timestamp',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="build-timestamp" content="${buildTimestamp}">\n</head>`,
        );
      },
    },
  ],
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
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
