import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyANLWObqY9dB9w9H8xzFYe4-O643rcWEAQ",
  authDomain: "herbalife-3e916.firebaseapp.com",
  projectId: "herbalife-3e916",
  storageBucket: "herbalife-3e916.firebasestorage.app",
  messagingSenderId: "168640638003",
  appId: "1:168640638003:web:4922af1be903d0cc368746"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);
export default app;
