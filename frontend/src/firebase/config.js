// Import the functions you need from the SDKs you need
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Clear any existing apps and initialize fresh
const existingApps = getApps();
if (existingApps.length > 0) {
  existingApps.forEach(app => deleteApp(app));
}

// Initialize Firebase with fresh configuration
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Debug log to verify configuration
console.log('🔥 Firebase Config for Web App "casin":', {
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...'
});

export { db, app, firebaseConfig };
export default app; 