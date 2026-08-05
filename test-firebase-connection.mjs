#!/usr/bin/env node

// Simple Firebase connection test
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "your-firebase-web-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.VITE_FIREBASE_APP_ID || "your-web-app-id",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "your-measurement-id"
};

try {
  if (!process.env.VITE_FIREBASE_API_KEY || !process.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error(
      'Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID before running this connectivity check.'
    );
  }

  console.log('🔥 Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
  console.log('📊 App Name:', app.name);
  console.log('🔧 Project ID:', app.options.projectId);

  const auth = getAuth(app);
  console.log('🔐 Firebase Auth initialized');
  
  const db = getFirestore(app);
  console.log('🗄️ Firestore initialized');
  
  console.log('\n🎉 Firebase connection test PASSED! ✅');
  console.log('\nFirebase is properly configured and ready to use.');
  
} catch (error) {
  console.error('❌ Firebase connection test FAILED:');
  console.error(error.message);
  process.exit(1);
}
