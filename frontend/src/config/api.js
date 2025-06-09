// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Backend URLs
const BACKEND_URL = 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
const LOCAL_BACKEND_URL = 'http://localhost:3001';

const API_BASE_URL = isDevelopment 
  ? LOCAL_BACKEND_URL // Use local backend in development (localhost:8001)
  : BACKEND_URL; // Use deployed backend in production

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 