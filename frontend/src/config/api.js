// API Configuration - USING VITE PROXY
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Use relative URLs in development to go through Vite proxy
// Use absolute URLs in production
const API_BASE_URL = isDevelopment ? '' : 'http://localhost:3000';

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 