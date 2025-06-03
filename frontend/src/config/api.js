// API Configuration - Using frontend as temporary backend
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Use frontend's own API endpoints as temporary solution
const API_BASE_URL = isDevelopment 
  ? '' // Use Vite proxy in development
  : ''; // Use same domain (frontend) for API endpoints

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 