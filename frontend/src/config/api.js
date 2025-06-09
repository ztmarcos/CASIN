// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Backend URLs
const BACKEND_URL = 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
const LOCAL_BACKEND_URL = 'http://localhost:3001';
const HEROKU_BACKEND_URL = 'https://sis-casin-216c74c28e12.herokuapp.com';
const MOCK_BACKEND_URL = 'http://localhost:3002'; // Mock server for Firebase quota issues

// Use localhost for development with billing enabled
const API_BASE_URL = isDevelopment 
  ? LOCAL_BACKEND_URL // Use localhost for development  
  : HEROKU_BACKEND_URL; // Use Heroku in production

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 