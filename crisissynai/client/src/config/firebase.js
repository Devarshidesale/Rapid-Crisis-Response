import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDIPCykWtq6SyqSOgv0Dw9tXr2BFsCb9y8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crisissynai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crisissynai",
  storageBucket: "crisissynai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1045240219906",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1045240219906:web:e588e08a53e1db11e09a1b",
  measurementId: "G-5742SE4BF5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
