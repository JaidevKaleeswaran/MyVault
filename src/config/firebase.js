import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyACScT2FX33Et8KB9Mqt4x1-5aJdkSq2lE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'myvault-rho.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'myvault-rho',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'myvault-rho.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '525675241889',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:525675241889:web:e8e84462765c456ff56be0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-KJDZS6JEYM'
};

console.log("Firebase config loaded:", firebaseConfig);

// Initialize Firebase
let app, auth, db;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
