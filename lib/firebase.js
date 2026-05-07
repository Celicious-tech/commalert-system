import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTXwdgp-vLTtVBxFqIsCaWc7L38pooI7s",
  authDomain: "commalert-system.firebaseapp.com",
  projectId: "commalert-system",
  storageBucket: "commalert-system.firebasestorage.app",
  messagingSenderId: "928488765313",
  appId: "1:928488765313:web:3308bf3ce7e2b209c45a80",
  measurementId: "G-TF03XDCJHC"
};

// Initialize Firebase (malikayan ang "already exists" error sa Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// I-initialize ang Firestore
const db = getFirestore(app);

// IMPORTANTE: I-export ang db para magamit sa ubang files
export { db };