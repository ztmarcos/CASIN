import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'

// Load env file from root
dotenv.config({ path: path.resolve(__dirname, '.env') })

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    publicDir: 'public',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            utils: ['axios', 'xlsx', 'pdfjs-dist']
          }
        }
      }
    },
    server: {
      port: 5174,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      hmr: {
        protocol: 'ws',
        host: '192.168.1.125',
        overlay: false,
        timeout: 30000
      }
    },
    define: {
      global: 'globalThis',
      'process.env': JSON.stringify(env)
    }
  }
}) 