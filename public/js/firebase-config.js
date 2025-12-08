/**
 * Firebase Configuration
 * 
 * NOTE: You'll need to update this with your actual Firebase config
 * Get this from: Firebase Console > Project Settings > Your apps > Web app
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mf-clinref.firebaseapp.com",
  projectId: "mf-clinref",
  storageBucket: "mf-clinref.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth instance
const auth = firebase.auth();

// API base URL - will be your Firebase Functions URL after deploy
// For local development, use the emulator URL
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/mf-clinref/us-central1'
  : 'https://us-central1-mf-clinref.cloudfunctions.net';

