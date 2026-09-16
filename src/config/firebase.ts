// Firebase configuration for Screenplay Studio
// Project: screenplay-studio-607a5
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC95NPQK7BNh33Kmnz0QwJgPN9dy_TVlDw',
  authDomain: 'screenplay-studio-607a5.firebaseapp.com',
  projectId: 'screenplay-studio-607a5',
  storageBucket: 'screenplay-studio-607a5.firebasestorage.app',
  messagingSenderId: '98169581895',
  appId: '1:98169581895:web:411dfde79dffd95d5a1c62',
  measurementId: 'G-J7D3EX36K9',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser with support)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Initialize Auth
const auth = getAuth(app);

// Google Auth Provider with Drive scope
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Initialize Firestore
const db = getFirestore(app);

export { app, analytics, auth, googleProvider, db };
