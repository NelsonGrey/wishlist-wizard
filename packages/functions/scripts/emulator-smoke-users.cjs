const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'wishlist-wizard';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
const region = process.env.FUNCTIONS_REGION || 'us-central1';
const reportPath = process.env.SMOKE_REPORT_PATH || path.join('artifacts', 'smoke-users-report.json');

process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const app = initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app);

const runReport = {
  meta: {
    startedAt: new Date().toISOString(),
    projectId,
    authHost,
    functionsHost,
    region,
    reportPath
  },
  calls: [],
  success: false,
  summary: {
    totalCalls: 0,
    passedCalls: 0,
    failedCalls: 0,
    durationMs: 0
  }
};

const testUsers = [
  {
    email: 'smoke-owner@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke Owner'
  },
  {
    email: 'smoke-collab@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke Collaborator'
  },
  {
    email: 'smoke-viewer@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke Viewer'
  }
];

function logStep(message) {
  console.log(`✅ ${message}`);
}

async function signInWithPassword(email, password) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    }
  );

  const payload = await response.json();
  if (!response.ok || payload.error) {
    const errorMessage = payload && payload.error && payload.error.message ? payload.error.message : response.statusText;
    throw new Error(`Auth sign-in failed for ${email}: ${errorMessage}`);
  }

  return {
    idToken: payload.idToken,
    localId: payload.localId
  };
}

async function callFunction(functionName, idToken, data) {
  const startedAt = Date.now();

  let response;
  let payload;

  try {
    response = await fetch(
      `http://${functionsHost}/${projectId}/${region}/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ data: data || {} })
      }
    );

    payload = await response.json();
  } catch (error) {
    runReport.calls.push({
      functionName,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error && error.message ? error.message : String(error)
    });
    throw error;
  }

  if (!response.ok || payload.error) {
    const errorMessage = payload && payload.error && payload.error.message ? payload.error.message : response.statusText;
    runReport.calls.push({
      functionName,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      error: errorMessage
    });
    throw new Error(`${functionName} failed: ${errorMessage}`);
  }

  runReport.calls.push({
    functionName,
    status: 'passed',
    durationMs: Date.now() - startedAt,
    httpStatus: response.status
  });

  if (payload.result !== undefined) {
    const result = payload.result;
    if (
      result &&
      typeof result === 'object' &&
      Object.keys(result).length === 1 &&
      Object.prototype.hasOwnProperty.call(result, 'data')
    ) {
      return result.data;
    }
    return result;
  }

  if (payload.data !== undefined) return payload.data;
  return payload;
}

function writeReport(success, error) {
  const endedAt = new Date();
  runReport.meta.endedAt = endedAt.toISOString();
  runReport.success = Boolean(success);

  if (error) {
    runReport.error = {
      message: error && error.message ? error.message : String(error)
    };
  }

  runReport.summary.totalCalls = runReport.calls.length;
  runReport.summary.passedCalls = runReport.calls.filter(call => call.status === 'passed').length;
  runReport.summary.failedCalls = runReport.calls.filter(call => call.status === 'failed').length;
  runReport.summary.durationMs = new Date(runReport.meta.endedAt).getTime() - new Date(runReport.meta.startedAt).getTime();

  const absoluteReportPath = path.isAbsolute(reportPath)
    ? reportPath
    : path.join(process.cwd(), reportPath);

  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, JSON.stringify(runReport, null, 2));
  console.log(`🧾 Smoke report written to ${absoluteReportPath}`);
}

async function seedAuthAndProfiles() {
  const users = [];

  for (const user of testUsers) {
    try {
      const existing = await auth.getUserByEmail(user.email);
      await auth.deleteUser(existing.uid);
    } catch (error) {
      if (!error || error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const createdUser = await auth.createUser({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      emailVerified: true
    });

    await db.collection('users').doc(createdUser.uid).set({
      uid: createdUser.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      role: 'test-user'
    });

    users.push({ ...user, uid: createdUser.uid });
  }

  logStep(`Seeded ${users.length} synthetic Auth users and Firestore profiles`);
  return users;
}

async function seedAdminUser() {
  const adminUser = {
    email: 'smoke-admin-users@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke Admin Users'
  };

  try {
    const existing = await auth.getUserByEmail(adminUser.email);
    await auth.deleteUser(existing.uid);
  } catch (error) {
    if (!error || error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  const createdUser = await auth.createUser({
    email: adminUser.email,
    password: adminUser.password,
    displayName: adminUser.displayName,
    emailVerified: true
  });

  await auth.setCustomUserClaims(createdUser.uid, {
    admin: true,
    role: 'admin'
  });

  const tokenResult = await signInWithPassword(adminUser.email, adminUser.password);
  return { ...adminUser, uid: createdUser.uid, ...tokenResult };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runWishlistSmoke(ownerToken) {
  const before = await callFunction('getUserWishlists', ownerToken, {});
  assertCondition(Array.isArray(before), 'Expected getUserWishlists to return an array');
  logStep('Verified getUserWishlists returns data for authenticated user');

  const created = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Wishlist ${Date.now()}`,
    description: 'Automated smoke wishlist',
    isPublic: false,
    isCollaborative: true
  });

  assertCondition(Boolean(created && created.id), 'Expected createWishlist to return an id');
  const wishlistId = created.id;
  logStep('Verified createWishlist can create a wishlist');

  const addedItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId,
    title: 'Smoke Item',
    description: 'Automated smoke item',
    price: '$19.99',
    productUrl: 'https://example.com/smoke-item',
    store: 'Smoke Store',
    priority: 1
  });

  assertCondition(Boolean(addedItem && addedItem.id), 'Expected addWishlistItem to return an id');
  const itemId = addedItem.id;
  logStep('Verified addWishlistItem can add item to wishlist');

  const items = await callFunction('getWishlistItems', ownerToken, { wishlistId });
  assertCondition(Array.isArray(items), 'Expected getWishlistItems to return an array');
  assertCondition(items.some(item => item.id === itemId), 'Expected created item in getWishlistItems response');
  logStep('Verified getWishlistItems returns created item');

  const updatedWishlist = await callFunction('updateWishlist', ownerToken, {
    wishlistId,
    name: 'Smoke Wishlist Updated'
  });
  assertCondition(updatedWishlist && updatedWishlist.name === 'Smoke Wishlist Updated', 'Expected updateWishlist to update name');
  logStep('Verified updateWishlist updates existing wishlist');

  const updatedItem = await callFunction('updateWishlistItem', ownerToken, {
    itemId,
    updates: {
      note: 'Updated by emulator smoke test'
    }
  });
  assertCondition(updatedItem && updatedItem.note === 'Updated by emulator smoke test', 'Expected updateWishlistItem to update note');
  logStep('Verified updateWishlistItem updates existing item');

  const deleteItemResult = await callFunction('deleteWishlistItem', ownerToken, { itemId });
  assertCondition(deleteItemResult && deleteItemResult.success === true, 'Expected deleteWishlistItem success=true');
  logStep('Verified deleteWishlistItem deletes existing item');

  const deleteWishlistResult = await callFunction('deleteWishlist', ownerToken, { wishlistId });
  assertCondition(deleteWishlistResult && deleteWishlistResult.success === true, 'Expected deleteWishlist success=true');
  logStep('Verified deleteWishlist deletes wishlist and related data');
}

async function runExtensionSmoke(ownerToken) {
  const authResult = await callFunction('authenticateExtension', ownerToken, {});
  assertCondition(authResult && authResult.authenticated === true, 'Expected authenticateExtension authenticated=true');
  logStep('Verified authenticateExtension returns authenticated user context');

  const extensionWishlist = await callFunction('createExtensionWishlist', ownerToken, {
    name: `Extension Smoke Wishlist ${Date.now()}`
  });
  assertCondition(Boolean(extensionWishlist && extensionWishlist.id), 'Expected createExtensionWishlist to return an id');
  const wishlistId = extensionWishlist.id;
  logStep('Verified createExtensionWishlist can create wishlist from extension flow');

  const addedItem = await callFunction('addItemFromExtension', ownerToken, {
    wishlistId,
    title: 'Extension Smoke Item',
    productUrl: 'https://example.com/extension-smoke-item',
    imageUrl: 'https://example.com/image.png',
    price: '$14.99',
    store: 'Example Store'
  });
  assertCondition(Boolean(addedItem && addedItem.id), 'Expected addItemFromExtension to return an id');
  const itemId = addedItem.id;
  logStep('Verified addItemFromExtension can add item');

  const shareResult = await callFunction('shareExtensionWishlist', ownerToken, { wishlistId });
  assertCondition(Boolean(shareResult && shareResult.shareUrl), 'Expected shareExtensionWishlist to return a shareUrl');
  logStep('Verified shareExtensionWishlist returns a share URL');

  const trackResult = await callFunction('trackExtensionEvent', ownerToken, {
    action: 'smoke_extension_event',
    category: 'smoke-test',
    label: 'extension',
    value: 1
  });
  assertCondition(trackResult && trackResult.success === true, 'Expected trackExtensionEvent success=true');
  logStep('Verified trackExtensionEvent records extension analytics event');

  const deleteItemResult = await callFunction('deleteExtensionItem', ownerToken, { itemId });
  assertCondition(deleteItemResult && deleteItemResult.success === true, 'Expected deleteExtensionItem success=true');
  logStep('Verified deleteExtensionItem removes extension-added item');

  const deleteWishlistResult = await callFunction('deleteWishlist', ownerToken, { wishlistId });
  assertCondition(deleteWishlistResult && deleteWishlistResult.success === true, 'Expected deleteWishlist success=true for extension wishlist');
  logStep('Verified extension-created wishlist cleanup');
}

async function runNotificationSmoke(ownerToken, ownerUid, adminToken) {
  const settingsBefore = await callFunction('getNotificationSettings', ownerToken, {});
  assertCondition(settingsBefore && typeof settingsBefore === 'object', 'Expected getNotificationSettings to return settings object');
  logStep('Verified getNotificationSettings returns settings');

  const updateSettingsResult = await callFunction('updateNotificationSettings', ownerToken, {
    settings: {
      email: false,
      push: true,
      priceAlerts: true,
      wishlistUpdates: false,
      collaborationUpdates: true,
      marketingEmails: false
    }
  });
  assertCondition(updateSettingsResult && updateSettingsResult.success === true, 'Expected updateNotificationSettings success=true');
  logStep('Verified updateNotificationSettings updates preferences');

  const createdNotification = await callFunction('createSystemNotification', adminToken, {
    targetUserId: ownerUid,
    type: 'smoke_test',
    title: 'Smoke Notification',
    content: 'Notification smoke test',
    data: { source: 'smoke-test' }
  });
  assertCondition(Boolean(createdNotification && createdNotification.id), 'Expected createSystemNotification to return id');
  const notificationId = createdNotification.id;
  logStep('Verified createSystemNotification creates a notification');

  const notificationsResult = await callFunction('getUserNotifications', ownerToken, { limit: 20 });
  assertCondition(Array.isArray(notificationsResult && notificationsResult.notifications), 'Expected getUserNotifications.notifications to be array');
  assertCondition(
    notificationsResult.notifications.some(notification => notification.id === notificationId),
    'Expected created notification in getUserNotifications response'
  );
  logStep('Verified getUserNotifications returns created notification');

  const markReadResult = await callFunction('markNotificationAsRead', ownerToken, { notificationId });
  assertCondition(markReadResult && markReadResult.isRead === true, 'Expected markNotificationAsRead to set isRead=true');
  logStep('Verified markNotificationAsRead marks notification as read');

  const createdNotification2 = await callFunction('createSystemNotification', adminToken, {
    targetUserId: ownerUid,
    type: 'smoke_test',
    title: 'Smoke Notification 2',
    content: 'Notification smoke test 2',
    data: { source: 'smoke-test' }
  });
  assertCondition(Boolean(createdNotification2 && createdNotification2.id), 'Expected second createSystemNotification to return id');
  const notificationId2 = createdNotification2.id;

  const markAllResult = await callFunction('markAllNotificationsAsRead', ownerToken, {});
  assertCondition(markAllResult && markAllResult.success === true, 'Expected markAllNotificationsAsRead success=true');
  logStep('Verified markAllNotificationsAsRead executes successfully');

  const deleteNotificationResult = await callFunction('deleteNotification', ownerToken, { notificationId });
  assertCondition(deleteNotificationResult && deleteNotificationResult.success === true, 'Expected deleteNotification success=true');

  const deleteNotificationResult2 = await callFunction('deleteNotification', ownerToken, { notificationId: notificationId2 });
  assertCondition(deleteNotificationResult2 && deleteNotificationResult2.success === true, 'Expected deleteNotification success=true for second notification');
  logStep('Verified deleteNotification removes smoke notifications');
}

async function runCalendarSmoke(ownerToken) {
  const createdEvent = await callFunction('createCalendarEvent', ownerToken, {
    title: `Smoke Event ${Date.now()}`,
    description: 'Calendar smoke event',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    allDay: false,
    type: 'reminder'
  });
  assertCondition(Boolean(createdEvent && createdEvent.id), 'Expected createCalendarEvent to return id');
  const eventId = createdEvent.id;
  logStep('Verified createCalendarEvent can create calendar event');

  const events = await callFunction('getCalendarEvents', ownerToken, {});
  assertCondition(Array.isArray(events), 'Expected getCalendarEvents to return array');
  assertCondition(events.some(event => event.id === eventId), 'Expected created event in getCalendarEvents response');
  logStep('Verified getCalendarEvents returns created event');

  const updateEventResult = await callFunction('updateCalendarEvent', ownerToken, {
    eventId,
    updates: {
      title: 'Smoke Event Updated'
    }
  });
  assertCondition(updateEventResult && updateEventResult.title === 'Smoke Event Updated', 'Expected updateCalendarEvent to update title');
  logStep('Verified updateCalendarEvent updates event');

  const connections = await callFunction('getCalendarConnections', ownerToken, {});
  assertCondition(Array.isArray(connections), 'Expected getCalendarConnections to return array');
  logStep('Verified getCalendarConnections executes for authenticated user');

  const syncSettings = await callFunction('getCalendarSyncSettings', ownerToken, {});
  assertCondition(syncSettings && typeof syncSettings === 'object', 'Expected getCalendarSyncSettings to return object');
  assertCondition(syncSettings.google && syncSettings.apple && syncSettings.outlook, 'Expected sync settings to include provider keys');
  logStep('Verified getCalendarSyncSettings returns provider connection states');

  const deleteEventResult = await callFunction('deleteCalendarEvent', ownerToken, { eventId });
  assertCondition(deleteEventResult && deleteEventResult.success === true, 'Expected deleteCalendarEvent success=true');
  logStep('Verified deleteCalendarEvent deletes event');
}

async function main() {
  console.log('🧪 Running emulator smoke test with synthetic users...');
  console.log(`ℹ️ Project: ${projectId} | Auth: ${authHost} | Functions: ${functionsHost}`);

  const seededUsers = await seedAuthAndProfiles();
  const signedIn = [];

  for (const user of seededUsers) {
    const tokenResult = await signInWithPassword(user.email, user.password);
    signedIn.push({ ...user, ...tokenResult });
  }
  logStep(`Authenticated ${signedIn.length} synthetic users via Auth Emulator`);

  const owner = signedIn[0];
  const adminUser = await seedAdminUser();

  await callFunction('createUserProfile', owner.idToken, {
    userId: owner.uid,
    email: owner.email,
    displayName: owner.displayName
  });
  logStep('Verified createUserProfile callable function');

  await runWishlistSmoke(owner.idToken);
  await runExtensionSmoke(owner.idToken);
  await runNotificationSmoke(owner.idToken, owner.uid, adminUser.idToken);
  await runCalendarSmoke(owner.idToken);

  console.log('🎉 Smoke test completed: synthetic users can authenticate and execute wishlist, extension, notification, and calendar flows.');
  writeReport(true);
}

main().catch(error => {
  console.error('❌ Emulator smoke test failed');
  console.error(error);
  writeReport(false, error);
  process.exitCode = 1;
});
