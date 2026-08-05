#!/usr/bin/env node

/**
 * Data Migration Script for Wishlist Wizard
 * Migrates data from PostgreSQL/Drizzle to Firebase Firestore
 * 
 * Usage:
 * npm run migrate:firestore [--dry-run] [--batch-size=100]
 * 
 * This script:
 * 1. Connects to the existing PostgreSQL database
 * 2. Exports all data in Firestore-compatible format
 * 3. Imports data to Firestore with proper structure
 * 4. Validates the migration
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { db } from '../packages/api-server/server/db.js';
import { 
  users, wishlists, wishlistItems, wishlistCollaborators, 
  beneficiaries, notifications, priceAlerts 
} from '@wishlist-wizard/shared';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

console.log(`🔥 Wishlist Wizard Data Migration`);
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}`);
console.log(`Batch Size: ${batchSize}`);
console.log('');

// Initialize Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const firestore = getFirestore(app);

/**
 * Convert PostgreSQL data to Firestore format
 */
function convertToFirestoreFormat(data, tableName) {
  const converted = { ...data };
  
  // Convert Date objects to Firestore Timestamps
  const dateFields = {
    users: ['createdAt', 'lastLogin', 'verificationExpires', 'passwordResetExpires'],
    wishlists: ['createdAt', 'occasionDate'],
    wishlistItems: ['createdAt', 'reservedAt', 'purchasedAt'],
    wishlistCollaborators: ['addedAt', 'lastActive'],
    beneficiaries: ['createdAt', 'birthdate'],
    notifications: ['createdAt'],
    priceAlerts: ['createdAt', 'triggeredAt', 'expiresAt']
  };
  
  const fields = dateFields[tableName] || [];
  fields.forEach(field => {
    if (converted[field] && converted[field] instanceof Date) {
      // Keep as Date object - Firestore will convert automatically
      // converted[field] = Timestamp.fromDate(converted[field]);
    }
  });
  
  // Remove undefined values
  Object.keys(converted).forEach(key => {
    if (converted[key] === undefined) {
      delete converted[key];
    }
  });
  
  return converted;
}

/**
 * Migrate a collection with batching
 */
async function migrateCollection(collectionName, postgresTable, batchSize = 100) {
  console.log(`📦 Migrating ${collectionName}...`);
  
  try {
    // Get total count
    const totalData = await db.select().from(postgresTable);
    const total = totalData.length;
    
    if (total === 0) {
      console.log(`   ✅ No data to migrate for ${collectionName}`);
      return { success: true, migrated: 0, errors: [] };
    }
    
    console.log(`   📊 Found ${total} records to migrate`);
    
    const errors = [];
    let migrated = 0;
    
    // Process in batches
    for (let i = 0; i < total; i += batchSize) {
      const batch = totalData.slice(i, i + batchSize);
      console.log(`   🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)} (${batch.length} items)`);
      
      if (!isDryRun) {
        const firestoreBatch = firestore.batch();
        
        for (const item of batch) {
          try {
            const docId = item.id.toString();
            const docRef = firestore.collection(collectionName).doc(docId);
            const firestoreData = convertToFirestoreFormat(item, collectionName);
            
            // Remove the id field since it's now the document ID
            delete firestoreData.id;
            
            firestoreBatch.set(docRef, firestoreData);
            migrated++;
          } catch (error) {
            errors.push({ item: item.id, error: error.message });
            console.error(`   ❌ Error preparing ${item.id}:`, error.message);
          }
        }
        
        try {
          await firestoreBatch.commit();
        } catch (error) {
          console.error(`   ❌ Batch commit failed:`, error.message);
          errors.push({ batch: i, error: error.message });
        }
      } else {
        // Dry run - just count
        migrated += batch.length;
      }
    }
    
    console.log(`   ✅ ${collectionName}: ${migrated}/${total} records processed`);
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} errors occurred`);
    }
    
    return { success: errors.length === 0, migrated, errors, total };
    
  } catch (error) {
    console.error(`   ❌ Failed to migrate ${collectionName}:`, error.message);
    return { success: false, migrated: 0, errors: [{ collection: collectionName, error: error.message }] };
  }
}

/**
 * Validate migration by comparing counts
 */
async function validateMigration() {
  console.log(`🔍 Validating migration...`);
  
  const collections = [
    { name: 'users', table: users },
    { name: 'wishlists', table: wishlists },
    { name: 'wishlistItems', table: wishlistItems },
    { name: 'collaborators', table: wishlistCollaborators },
    { name: 'beneficiaries', table: beneficiaries },
    { name: 'notifications', table: notifications },
    { name: 'priceAlerts', table: priceAlerts }
  ];
  
  const results = [];
  
  for (const { name, table } of collections) {
    try {
      const postgresCount = (await db.select().from(table)).length;
      const firestoreCount = isDryRun ? postgresCount : (await firestore.collection(name).get()).size;
      
      const match = postgresCount === firestoreCount;
      results.push({ collection: name, postgres: postgresCount, firestore: firestoreCount, match });
      
      console.log(`   ${match ? '✅' : '❌'} ${name}: PostgreSQL=${postgresCount}, Firestore=${firestoreCount}`);
    } catch (error) {
      console.error(`   ❌ Error validating ${name}:`, error.message);
      results.push({ collection: name, error: error.message, match: false });
    }
  }
  
  const allMatch = results.every(r => r.match);
  console.log(`   ${allMatch ? '✅' : '❌'} Overall validation: ${allMatch ? 'PASSED' : 'FAILED'}`);
  
  return { success: allMatch, results };
}

/**
 * Generate migration report
 */
async function generateReport(migrationResults, validation) {
  const report = {
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'dry-run' : 'production',
    batchSize,
    migration: migrationResults,
    validation,
    summary: {
      totalRecords: migrationResults.reduce((sum, r) => sum + (r.total || 0), 0),
      totalMigrated: migrationResults.reduce((sum, r) => sum + r.migrated, 0),
      totalErrors: migrationResults.reduce((sum, r) => sum + r.errors.length, 0),
      success: migrationResults.every(r => r.success) && validation.success
    }
  };
  
  const reportPath = join(process.cwd(), `migration-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Migration report saved to: ${reportPath}`);
  return report;
}

/**
 * Main migration function
 */
async function main() {
  console.log(`🚀 Starting migration process...\n`);
  
  const migrationResults = [];
  
  // Define migration order (important for referential integrity)
  const migrationPlan = [
    { name: 'users', table: users },
    { name: 'beneficiaries', table: beneficiaries },
    { name: 'wishlists', table: wishlists },
    { name: 'wishlistItems', table: wishlistItems },
    { name: 'collaborators', table: wishlistCollaborators }, // Note: collection name change
    { name: 'notifications', table: notifications },
    { name: 'priceAlerts', table: priceAlerts }
  ];
  
  // Execute migrations
  for (const { name, table } of migrationPlan) {
    const result = await migrateCollection(name, table, batchSize);
    migrationResults.push({ collection: name, ...result });
  }
  
  // Validate migration
  const validation = await validateMigration();
  
  // Generate report
  const report = await generateReport(migrationResults, validation);
  
  // Summary
  console.log(`\n🎯 Migration Summary:`);
  console.log(`   Total Records: ${report.summary.totalRecords}`);
  console.log(`   Migrated: ${report.summary.totalMigrated}`);
  console.log(`   Errors: ${report.summary.totalErrors}`);
  console.log(`   Success: ${report.summary.success ? '✅ YES' : '❌ NO'}`);
  
  if (!report.summary.success) {
    console.log(`\n⚠️  Migration completed with issues. Check the report for details.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 Migration completed successfully!`);
    
    if (!isDryRun) {
      console.log(`\n📋 Next Steps:`);
      console.log(`   1. Update environment variables to use Firestore: USE_FIRESTORE=true`);
      console.log(`   2. Deploy Firebase security rules: npm run firebase:deploy:rules`);
      console.log(`   3. Deploy Firebase indexes: npm run firebase:deploy:indexes`);
      console.log(`   4. Test the application with Firestore`);
      console.log(`   5. Consider decommissioning PostgreSQL after validation period`);
    }
  }
  
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});