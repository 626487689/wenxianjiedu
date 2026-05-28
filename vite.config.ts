import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const root = process.cwd()
const buildTime = new Date().toISOString()

export default defineConfig({
  root,
  plugins: [react()],
  clearScreen: false,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
      binaryInterval: 3000,
    },
    proxy: {
      '/api': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
      '/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openrouter/, '/api/v1'),
        secure: false,
      },
      '/local': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local/, '/v1'),
        secure: false,
      },
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2020', 'chrome105', 'safari13'],
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]',
      },
    },
  },
})
