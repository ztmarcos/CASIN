// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Backend URLs
const LOCAL_BACKEND_URL = 'http://localhost:3001'; // Local development
const HEROKU_BACKEND_URL = 'https://sis-casin-216c74c28e12.herokuapp.com'; // Production on Heroku

// Use localhost for development, Heroku for production
const API_BASE_URL = isDevelopment 
  ? LOCAL_BACKEND_URL
  : HEROKU_BACKEND_URL;

export const API_URL = `${API_BASE_URL}/api`;
export const BASE_URL = API_BASE_URL;

export default {
  API_URL,
  BASE_URL
}; 