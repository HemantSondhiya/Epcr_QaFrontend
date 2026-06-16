import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || env.API_BASE_URL || 'http://147.93.108.99:7079';

  return {
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
            if (id.includes('node_modules/@reduxjs') || id.includes('node_modules/react-redux')) return 'redux';
            if (id.includes('node_modules/recharts')) return 'charts';
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/framer-motion')) return 'ui';
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          // Rewrite Set-Cookie domain so browser stores cookies under localhost:5173
          cookieDomainRewrite: { '*': '' },
        },
        '/files': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
})
