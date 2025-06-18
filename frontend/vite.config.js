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
        },
        // Proxy Firebase Storage requests to avoid CORS issues in development
        '/firebasestorage': {
          target: 'https://firebasestorage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/firebasestorage/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔄 Proxying Firebase Storage request:', req.url);
              // Forward auth headers
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Add CORS headers to response
              proxyRes.headers['access-control-allow-origin'] = '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, x-goog-resumable';
              proxyRes.headers['access-control-max-age'] = '86400';
            });
            proxy.on('error', (err, req, res) => {
              console.error('❌ Proxy error:', err);
            });
          }
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