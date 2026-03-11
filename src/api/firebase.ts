// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Substitua pelos dados que você copiou do Console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC79SWUMsslQAzjBbrppsz9VP47Y6PM0-k",
  authDomain: "sliviproject.firebaseapp.com",
  projectId: "sliviproject",
  storageBucket: "sliviproject.firebasestorage.app",
  messagingSenderId: "604734202853",
  appId: "1:604734202853:web:a6c11ece1f8dbc6278050c",
  measurementId: "G-E47XPYL46P"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Realtime Database e exporta para usar nos Hooks
export const database = getDatabase(app);