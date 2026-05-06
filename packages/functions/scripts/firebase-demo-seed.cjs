/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const dataFilePath = path.resolve(__dirname, 'firebase-demo-seed-data.json');
const projectId = process.env.DEMO_SEED_PROJECT_ID || process.env.GCLOUD_PROJECT || 'wishlist-wizard';
const allowProd = process.env.DEMO_SEED_ALLOW_PRODUCTION === 'true';
const force = process.argv.includes('--force');

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

function assertSafetyGuard() {
  if (isEmulator || allowProd || force) {
    return;
  }

  throw new Error(
    'Safety guard triggered: refusing to seed non-emulator Firebase without explicit opt-in. ' +
      'Set DEMO_SEED_ALLOW_PRODUCTION=true or pass --force to continue.'
  );
}

function readSeedData() {
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`Seed data file not found: ${dataFilePath}`);
  }

  return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
}

async function upsertAuthUsers(auth, db, users) {
  const userMap = new Map();

  for (const user of users) {
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) continue;

    let uid;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      await auth.updateUser(uid, {
        displayName: user.displayName,
        password: user.password,
        emailVerified: true,
      });
      console.log(`Updated Auth user: ${email}`);
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        const created = await auth.createUser({
          email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
        uid = created.uid;
        console.log(`Created Auth user: ${email}`);
      } else {
        throw error;
      }
    }

    await db.collection('users').doc(uid).set(
      {
        uid,
        email,
        displayName: user.displayName,
        role: user.role || 'demo-user',
        source: 'demo-seed',
        updatedAt: new Date(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    userMap.set(email, uid);
  }

  return userMap;
}

async function upsertWishlists(db, wishlists, userMap) {
  const wishlistMap = new Map();

  for (const wishlist of wishlists) {
    const ownerEmail = String(wishlist.owner || '').trim().toLowerCase();
    const ownerUid = userMap.get(ownerEmail);
    if (!ownerUid) {
      throw new Error(`Wishlist owner not found in seed users: ${ownerEmail}`);
    }

    const slug = String(wishlist.slug || '').trim();
    if (!slug) {
      throw new Error('Each wishlist requires a slug value in seed data');
    }

    const existing = await db.collection('wishlists').where('seedSlug', '==', slug).limit(1).get();
    const shareId = `demo-${slug}`;

    const payload = {
      userId: ownerUid,
      name: wishlist.name,
      description: wishlist.description || '',
      isPublic: Boolean(wishlist.isPublic),
      isCollaborative: Boolean(wishlist.isCollaborative),
      shareId,
      occasion: wishlist.occasion || null,
      recipientName: wishlist.recipientName || null,
      seedSlug: slug,
      source: 'demo-seed',
      updatedAt: new Date(),
    };

    if (existing.empty) {
      const docRef = await db.collection('wishlists').add({
        ...payload,
        createdAt: new Date(),
      });
      wishlistMap.set(slug, docRef.id);
      console.log(`Created wishlist: ${wishlist.name}`);
    } else {
      const doc = existing.docs[0];
      await doc.ref.set(payload, { merge: true });
      wishlistMap.set(slug, doc.id);
      console.log(`Updated wishlist: ${wishlist.name}`);
    }
  }

  return wishlistMap;
}

async function upsertItems(db, items, wishlistMap) {
  for (const item of items) {
    const wishlistSlug = String(item.wishlist || '').trim();
    const wishlistId = wishlistMap.get(wishlistSlug);
    if (!wishlistId) {
      throw new Error(`Item wishlist slug not found: ${wishlistSlug}`);
    }

    const lookup = await db
      .collection('wishlistItems')
      .where('wishlistId', '==', wishlistId)
      .where('title', '==', item.title)
      .where('source', '==', 'demo-seed')
      .limit(1)
      .get();

    const payload = {
      wishlistId,
      title: item.title,
      description: item.description || '',
      price: item.price || null,
      productUrl: item.productUrl || null,
      imageUrl: item.imageUrl || null,
      store: item.store || null,
      priority: item.priority || 1,
      source: 'demo-seed',
      updatedAt: new Date(),
    };

    if (lookup.empty) {
      await db.collection('wishlistItems').add({
        ...payload,
        createdAt: new Date(),
      });
      console.log(`Created item: ${item.title}`);
    } else {
      await lookup.docs[0].ref.set(payload, { merge: true });
      console.log(`Updated item: ${item.title}`);
    }
  }
}

async function upsertCollaborators(db, collaborators, wishlistMap, userMap) {
  for (const collaborator of collaborators) {
    const wishlistSlug = String(collaborator.wishlist || '').trim();
    const wishlistId = wishlistMap.get(wishlistSlug);
    if (!wishlistId) {
      throw new Error(`Collaborator wishlist slug not found: ${wishlistSlug}`);
    }

    const userEmail = String(collaborator.user || '').trim().toLowerCase();
    const userId = userMap.get(userEmail);
    if (!userId) {
      throw new Error(`Collaborator user not found: ${userEmail}`);
    }

    const existing = await db
      .collection('collaborators')
      .where('wishlistId', '==', wishlistId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    const payload = {
      wishlistId,
      userId,
      role: collaborator.role || 'viewer',
      addedAt: new Date(),
      addedBy: 'demo-seed',
      source: 'demo-seed',
    };

    if (existing.empty) {
      await db.collection('collaborators').add(payload);
      console.log(`Added collaborator: ${userEmail} -> ${wishlistSlug}`);
    } else {
      await existing.docs[0].ref.set(payload, { merge: true });
      console.log(`Updated collaborator: ${userEmail} -> ${wishlistSlug}`);
    }
  }
}

async function upsertNotifications(db, notifications, userMap) {
  for (const notification of notifications) {
    const userEmail = String(notification.user || '').trim().toLowerCase();
    const userId = userMap.get(userEmail);
    if (!userId) {
      throw new Error(`Notification user not found: ${userEmail}`);
    }

    const existing = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('title', '==', notification.title)
      .where('source', '==', 'demo-seed')
      .limit(1)
      .get();

    const payload = {
      userId,
      type: notification.type || 'system',
      title: notification.title,
      content: notification.content,
      isRead: false,
      source: 'demo-seed',
      updatedAt: new Date(),
    };

    if (existing.empty) {
      await db.collection('notifications').add({
        ...payload,
        createdAt: new Date(),
      });
      console.log(`Created notification: ${notification.title}`);
    } else {
      await existing.docs[0].ref.set(payload, { merge: true });
      console.log(`Updated notification: ${notification.title}`);
    }
  }
}

async function run() {
  assertSafetyGuard();

  if (!getApps().length) {
    initializeApp({ projectId });
  }

  const auth = getAuth();
  const db = getFirestore();
  const seedData = readSeedData();

  console.log('Seeding Firebase demo dataset...');
  console.log(`Project: ${projectId}`);
  console.log(`Firestore emulator host: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
  console.log(`Auth emulator host: ${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set'}`);

  const userMap = await upsertAuthUsers(auth, db, seedData.users || []);
  const wishlistMap = await upsertWishlists(db, seedData.wishlists || [], userMap);
  await upsertItems(db, seedData.items || [], wishlistMap);
  await upsertCollaborators(db, seedData.collaborators || [], wishlistMap, userMap);
  await upsertNotifications(db, seedData.notifications || [], userMap);

  console.log('Firebase demo seed complete.');
  console.log('Demo users (password for all: DemoPass123!):');
  for (const user of seedData.users || []) {
    console.log(`- ${user.email}`);
  }
}

run().catch((error) => {
  console.error('Firebase demo seed failed:', error);
  process.exit(1);
});
