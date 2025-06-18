// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
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

// Check if configuration is valid
const isConfigValid = Object.values(firebaseConfig).every(value => value && value !== 'undefined');

if (!isConfigValid) {
  console.error('❌ Firebase configuration is incomplete:', firebaseConfig);
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
}

// Debug log to verify configuration (safely)
console.log('🔥 Firebase Config for Web App "casin":', {
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket
});

// Initialize Firebase only if not already initialized
let app;
const existingApps = getApps();

if (existingApps.length === 0) {
  console.log('🚀 Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
} else {
  console.log('🔄 Using existing Firebase app');
  app = existingApps[0];
}

// Initialize Firestore with error handling
let db;
try {
  db = getFirestore(app);
  console.log('✅ Firestore initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firestore:', error);
  throw error;
}

// Initialize Auth
let auth;
try {
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Auth:', error);
  throw error;
}

// Initialize Storage
let storage;
try {
  storage = getStorage(app);
  console.log('✅ Firebase Storage initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Storage:', error);
  throw error;
}

export { db, auth, storage, app, firebaseConfig };
export default app; 