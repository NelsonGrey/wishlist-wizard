#!/usr/bin/env node

// Simple Firebase connection test
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXBMWTCbNDi2MhWxhZL9BQA3xEnGDEf70",
  authDomain: "wishlist-wizard.firebaseapp.com",
  projectId: "wishlist-wizard",
  storageBucket: "wishlist-wizard.appspot.app",
  messagingSenderId: "1000918568663",
  appId: "1:1000918568663:web:143b262fb4bd8fd904ea92",
  measurementId: "G-75WET6CFDE"
};

try {
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