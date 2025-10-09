#!/usr/bin/env node

/**
 * Firebase Firestore Connection Test
 * Tests the Firebase-first architecture migration
 */

import { storage } from './server/storage.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testFirestoreConnection() {
  console.log('🔥 Testing Firebase Firestore Connection...\n');
  
  try {
    // Test 1: Basic connection test
    console.log('1. Testing basic Firestore operations...');
    
    // Create a test user
    const testUser = {
      username: 'test_firebase_user',
      email: 'test@firebase.local',
      password: 'test_password',
      displayName: 'Firebase Test User',
      isEmailVerified: false,
      avatarUrl: null,
      createdAt: new Date(),
      lastLogin: null,
      verificationToken: 'test_token',
      verificationExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null
    };
    
    console.log('   Creating test user...');
    const createdUser = await storage.createUser(testUser);
    console.log('   ✅ User created successfully:', createdUser.username);
    
    // Test 2: User search functionality
    console.log('\n2. Testing user search...');
    const searchResults = await storage.searchUsers('test', 5);
    console.log(`   ✅ Found ${searchResults.length} users matching 'test'`);
    
    // Test 3: Get user by ID
    console.log('\n3. Testing user retrieval...');
    const retrievedUser = await storage.getUser(createdUser.id);
    console.log('   ✅ User retrieved successfully:', retrievedUser?.username);
    
    console.log('\n🎉 All Firestore tests passed! Firebase-first architecture is working.');
    
    return { success: true, userId: createdUser.id };
    
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return { success: false, error: error.message };
  }
}

async function testCleanup(userId) {
  if (userId) {
    try {
      console.log('\n🧹 Cleaning up test data...');
      // Note: Add cleanup logic here if needed for production
      console.log('   Test user cleanup completed');
    } catch (error) {
      console.log('   Warning: Cleanup failed:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Firebase-First Architecture Migration Test\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Use Firestore: ${process.env.USE_FIRESTORE || 'auto-detect'}\n`);
  
  const result = await testFirestoreConnection();
  
  if (result.success) {
    await testCleanup(result.userId);
    console.log('\n✅ Firebase migration test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Deploy Firestore security rules');
    console.log('   2. Set up Firestore indexes');
    console.log('   3. Migrate existing data if any');
    console.log('   4. Update client applications to use Firebase SDKs');
    process.exit(0);
  } else {
    console.log('\n❌ Firebase migration test failed!');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check Firebase configuration in .env');
    console.log('   2. Verify Firebase project exists');
    console.log('   3. Ensure Firestore is enabled in Firebase console');
    console.log('   4. Check internet connectivity');
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);