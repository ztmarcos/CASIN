// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Backend URLs
const BACKEND_URL = 'https://casin-crm-backend-ztmarcos-projects.vercel.app';

const API_BASE_URL = isDevelopment 
  ? '' // Use Vite proxy in development (localhost:3000)
  : BACKEND_URL; // Use deployed backend in production

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 