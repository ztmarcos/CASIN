// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Backend URLs
const LOCAL_BACKEND_URL = 'http://localhost:3001'; // Local development
// Production: set in .env or at build time so redeploys don't require code changes (see scripts/update-frontend-api-url.sh)
const FIREBASE_API_BASE = import.meta.env.VITE_FIREBASE_API_BASE || 'https://api-d7zlm7v4qa-uc.a.run.app';
const RUN_APP_HASH = import.meta.env.VITE_RUN_APP_HASH || 'd7zlm7v4qa-uc.a.run.app';

// Production: all API from Firebase (Cloud Run). Development: local backend.
const API_BASE_URL = isDevelopment ? LOCAL_BACKEND_URL : FIREBASE_API_BASE;

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

// Other Cloud Functions (2nd gen = run.app)
export const FIREBASE_API = {
  sendEmail: `https://sendemail-${RUN_APP_HASH}`,
  gptAnalyzeActivity: `https://gptanalyzeactivity-${RUN_APP_HASH}`,
  getResumenConfig: `https://getresumenconfig-${RUN_APP_HASH}`,
  updateResumenConfig: `https://updateresumenconfig-${RUN_APP_HASH}`
};

export default {
  API_URL,
  BASE_URL,
  FIREBASE_API
}; 