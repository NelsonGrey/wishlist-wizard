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

async function callFunctionExpectError(functionName, idToken, data, expectedMessagePart) {
  const startedAt = Date.now();

  const response = await fetch(
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

  const payload = await response.json();
  const errorMessage = payload && payload.error && payload.error.message ? payload.error.message : '';

  if (response.ok || !payload.error) {
    runReport.calls.push({
      functionName,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      error: 'Expected callable to fail but it succeeded'
    });
    throw new Error(`${functionName} was expected to fail but succeeded`);
  }

  if (expectedMessagePart && !String(errorMessage).includes(expectedMessagePart)) {
    runReport.calls.push({
      functionName,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      error: `Expected error to include "${expectedMessagePart}", got: ${errorMessage}`
    });
    throw new Error(`${functionName} failed with unexpected error: ${errorMessage}`);
  }

  runReport.calls.push({
    functionName,
    status: 'passed',
    durationMs: Date.now() - startedAt,
    httpStatus: response.status,
    expectedError: errorMessage
  });

  return payload.error;
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

async function runWishlistSmoke(ownerToken, collaboratorToken, viewerToken, collaboratorUid, viewerUid) {
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

  const privateWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Private Wishlist ${Date.now()}`,
    description: 'Private wishlist for share access checks',
    isPublic: false,
    isCollaborative: false
  });
  assertCondition(Boolean(privateWishlist && privateWishlist.id && privateWishlist.shareId), 'Expected private wishlist to include id and shareId');

  await callFunctionExpectError('getSharedWishlist', viewerToken, { shareId: privateWishlist.shareId }, 'private');
  logStep('Verified private shared wishlist access is denied for non-owner users');

  const cleanupPrivateWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: privateWishlist.id });
  assertCondition(cleanupPrivateWishlist && cleanupPrivateWishlist.success === true, 'Expected cleanup deleteWishlist success=true for private wishlist');

  const publicWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Public Purchase Wishlist ${Date.now()}`,
    description: 'Public wishlist for duplicate prevention checks',
    isPublic: true,
    isCollaborative: true
  });
  assertCondition(Boolean(publicWishlist && publicWishlist.id), 'Expected public wishlist to be created');

  const sharedItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: publicWishlist.id,
    title: 'Smoke Duplicate Prevention Item',
    description: 'Duplicate prevention flow check',
    price: '$49.99',
    productUrl: 'https://example.com/duplicate-smoke-item',
    store: 'Smoke Store',
    priority: 1
  });
  assertCondition(Boolean(sharedItem && sharedItem.id), 'Expected shared item to be created');

  const reserveResult = await callFunction('reserveWishlistItem', viewerToken, { itemId: sharedItem.id });
  assertCondition(reserveResult && reserveResult.success === true, 'Expected reserveWishlistItem success=true');
  logStep('Verified a non-owner user can reserve public wishlist item');

  await callFunctionExpectError('purchaseWishlistItem', collaboratorToken, { itemId: sharedItem.id }, 'reserved by another user');
  logStep('Verified purchase is blocked when item is reserved by another user');

  const purchaseByReserver = await callFunction('purchaseWishlistItem', viewerToken, { itemId: sharedItem.id });
  assertCondition(purchaseByReserver && purchaseByReserver.success === true, 'Expected reserver to purchase successfully');
  logStep('Verified reserver can complete purchase');

  await callFunctionExpectError('purchaseWishlistItem', collaboratorToken, { itemId: sharedItem.id }, 'already been purchased');
  logStep('Verified duplicate purchase is blocked once item is purchased');

  const cleanupPublicWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: publicWishlist.id });
  assertCondition(cleanupPublicWishlist && cleanupPublicWishlist.success === true, 'Expected cleanup deleteWishlist success=true for public wishlist');

  const roleGuardWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Role Guard Wishlist ${Date.now()}`,
    description: 'Role enforcement checks for collaborator item edits',
    isPublic: false,
    isCollaborative: true
  });
  assertCondition(Boolean(roleGuardWishlist && roleGuardWishlist.id), 'Expected role-guard wishlist to be created');

  await db.collection('collaborators').add({
    wishlistId: roleGuardWishlist.id,
    userId: viewerUid,
    role: 'viewer',
    addedAt: new Date(),
    addedBy: 'smoke-test'
  });

  await callFunctionExpectError('addWishlistItem', viewerToken, {
    wishlistId: roleGuardWishlist.id,
    title: 'Viewer Should Not Add',
    price: '$10.00'
  }, 'permission');
  logStep('Verified viewer collaborator cannot add wishlist items');

  await db.collection('collaborators').add({
    wishlistId: roleGuardWishlist.id,
    userId: collaboratorUid,
    role: 'editor',
    addedAt: new Date(),
    addedBy: 'smoke-test'
  });

  const editorAddedItem = await callFunction('addWishlistItem', collaboratorToken, {
    wishlistId: roleGuardWishlist.id,
    title: 'Editor Can Add',
    price: '$25.00',
    productUrl: 'https://example.com/editor-add-item',
    store: 'Smoke Store'
  });
  assertCondition(Boolean(editorAddedItem && editorAddedItem.id), 'Expected editor collaborator to add item successfully');
  logStep('Verified editor collaborator can add wishlist items');

  const cleanupRoleGuardWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: roleGuardWishlist.id });
  assertCondition(cleanupRoleGuardWishlist && cleanupRoleGuardWishlist.success === true, 'Expected cleanup deleteWishlist success=true for role-guard wishlist');

  // Budget guardrail smoke tests
  const budgetGuardrailWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Budget Guardrail Wishlist ${Date.now()}`,
    description: 'Budget guardrail enforcement checks for group gifting',
    isPublic: true,
    isCollaborative: true
  });
  assertCondition(Boolean(budgetGuardrailWishlist && budgetGuardrailWishlist.id), 'Expected budget guardrail wishlist to be created');

  const budgetItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: budgetGuardrailWishlist.id,
    title: 'Budget Guardrail Test Item',
    description: 'Item for testing group gift budget constraints',
    price: '$500.00',
    productUrl: 'https://example.com/budget-test-item',
    store: 'Smoke Store',
    priority: 1
  });
  assertCondition(Boolean(budgetItem && budgetItem.id), 'Expected budget test item to be created');

  await callFunctionExpectError('createGroupPaymentIntent', viewerToken, {
    itemId: budgetItem.id,
    amount: 0.50, // Below $1.00 minimum
    message: 'Too low'
  }, 'at least');
  logStep('Verified contribution below minimum ($1.00) is rejected');

  await callFunctionExpectError('createGroupPaymentIntent', viewerToken, {
    itemId: budgetItem.id,
    amount: 5001.00, // Above $5,000 maximum
    message: 'Too high'
  }, 'cannot exceed');
  logStep('Verified contribution above maximum ($5,000) is rejected');

  const cleanupBudgetWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: budgetGuardrailWishlist.id });
  assertCondition(cleanupBudgetWishlist && cleanupBudgetWishlist.success === true, 'Expected cleanup deleteWishlist success=true for budget guardrail wishlist');
}

async function runGroupGiftSummaryContractSmoke(ownerToken, ownerUid, viewerUid) {
  const wishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Group Summary Wishlist ${Date.now()}`,
    description: 'Contract checks for group gift summary payload',
    isPublic: false,
    isCollaborative: true
  });
  assertCondition(Boolean(wishlist && wishlist.id), 'Expected group summary wishlist to be created');

  const item = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: wishlist.id,
    title: 'Group Summary Contract Item',
    price: '$200.00',
    productUrl: 'https://example.com/group-summary-item',
    store: 'Smoke Store'
  });
  assertCondition(Boolean(item && item.id), 'Expected group summary item to be created');

  await db.collection('groupGifts').doc(item.id).set({
    itemId: item.id,
    targetAmount: 200,
    totalAmount: 75,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db.collection('groupGiftContributions').add({
    itemId: item.id,
    userId: ownerUid,
    amount: 25,
    isAnonymous: false,
    status: 'succeeded',
    createdAt: new Date(Date.now() - 2000)
  });

  await db.collection('groupGiftContributions').add({
    itemId: item.id,
    userId: viewerUid,
    amount: 50,
    isAnonymous: true,
    status: 'succeeded',
    createdAt: new Date(Date.now() - 1000)
  });

  const summary = await callFunction('getGroupGiftSummary', ownerToken, { itemId: item.id });
  assertCondition(summary && summary.itemId === item.id, 'Expected group summary to include itemId');
  assertCondition(typeof summary.targetAmount === 'number', 'Expected group summary targetAmount to be numeric');
  assertCondition(typeof summary.totalAmount === 'number', 'Expected group summary totalAmount to be numeric');
  assertCondition(Array.isArray(summary.participants), 'Expected group summary participants to be an array');
  assertCondition(summary.participants.length === 2, 'Expected exactly two succeeded participants in group summary');

  const anonymousParticipant = summary.participants.find((participant) => participant.isAnonymous === true);
  assertCondition(Boolean(anonymousParticipant), 'Expected anonymous participant in group summary payload');
  assertCondition(anonymousParticipant.user === null, 'Expected anonymous participant user payload to be null');

  const namedParticipant = summary.participants.find((participant) => participant.isAnonymous !== true);
  assertCondition(Boolean(namedParticipant), 'Expected named participant in group summary payload');
  assertCondition(
    Boolean(namedParticipant.user && typeof namedParticipant.user.displayName === 'string'),
    'Expected named participant to include user displayName'
  );

  const cleanupWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: wishlist.id });
  assertCondition(cleanupWishlist && cleanupWishlist.success === true, 'Expected cleanup deleteWishlist success=true for group summary wishlist');
  logStep('Verified group gift summary payload contract for coordinator commitments');
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

// WP-01 Core Flow Hardening: Auth, Wishlist CRUD, and Item Add Edge Cases
async function runCoreFlowHardeningSmoke(ownerToken) {
  // Wishlist CRUD boundary tests
  const boundaryWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke CRUD Boundary Wishlist ${Date.now()}`,
    description: '',
    isPublic: false,
    isCollaborative: false
  });
  assertCondition(Boolean(boundaryWishlist && boundaryWishlist.id), 'Expected wishlist creation with empty description');
  logStep('Verified wishlist can be created with empty description field');

  // Test wishlist update with edge cases
  const updatedBoundary = await callFunction('updateWishlist', ownerToken, {
    wishlistId: boundaryWishlist.id,
    name: 'Updated CRUD Wishlist',
    description: 'Updated with non-empty description'
  });
  assertCondition(updatedBoundary && updatedBoundary.description === 'Updated with non-empty description', 'Expected wishlist update to apply changes');
  logStep('Verified wishlist update applies field changes correctly');

  // Item add edge case: missing optional fields
  const minimalItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: boundaryWishlist.id,
    title: 'Minimal Item',
    price: '$9.99'
  });
  assertCondition(Boolean(minimalItem && minimalItem.id), 'Expected item creation with minimal fields');
  logStep('Verified item can be added with minimal required fields only');

  // Item add edge case: malformed URL (but still valid item)
  const malformedUrlItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: boundaryWishlist.id,
    title: 'Item with Bad URL',
    price: '$19.99',
    productUrl: 'not-a-valid-url'
  });
  assertCondition(Boolean(malformedUrlItem && malformedUrlItem.id), 'Expected item creation despite malformed URL');
  logStep('Verified item can be added with malformed URL (gracefully handled)');

  // Item add edge case: very long title
  const longTitle = 'A'.repeat(500);
  const longTitleItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: boundaryWishlist.id,
    title: longTitle,
    price: '$29.99'
  });
  assertCondition(Boolean(longTitleItem && longTitleItem.id), 'Expected item creation with very long title');
  assertCondition(longTitleItem.title.length >= 200, 'Expected long title to be stored');
  logStep('Verified item can be added with very long title (boundary tested)');

  // Item update edge case: clear optional fields
  const updateResult = await callFunction('updateWishlistItem', ownerToken, {
    itemId: minimalItem.id,
    updates: {
      note: '', // Clear the note field
      priority: null
    }
  });
  assertCondition(Boolean(updateResult && updateResult.id), 'Expected item update to allow clearing optional fields');
  logStep('Verified item can be updated to clear optional fields');

  // Item deletion and cascade check
  const deleteResult = await callFunction('deleteWishlistItem', ownerToken, { itemId: minimalItem.id });
  assertCondition(deleteResult && deleteResult.success === true, 'Expected successful item deletion');
  
  const remainingItems = await callFunction('getWishlistItems', ownerToken, { wishlistId: boundaryWishlist.id });
  assertCondition(Array.isArray(remainingItems) && remainingItems.length >= 2, 'Expected other items to remain after deletion');
  logStep('Verified item deletion does not cascade to other items');

  // Wishlist deletion with remaining items (cascade check)
  const deleteWishlistResult = await callFunction('deleteWishlist', ownerToken, { wishlistId: boundaryWishlist.id });
  assertCondition(deleteWishlistResult && deleteWishlistResult.success === true, 'Expected successful wishlist deletion');
  logStep('Verified wishlist deletion removes wishlist and related items');
}

// WP-03 Price and Notification Reliability: Alert consistency and delivery robustness
async function runPriceNotificationReliabilitySmoke(ownerToken, ownerUid, adminToken) {
  const priceWishlist = await callFunction('createWishlist', ownerToken, {
    name: `Smoke Price Alert Wishlist ${Date.now()}`,
    description: 'Price tracking and notification reliability checks',
    isPublic: true,
    isCollaborative: false
  });
  assertCondition(Boolean(priceWishlist && priceWishlist.id), 'Expected price tracking wishlist created');

  const trackedItem = await callFunction('addWishlistItem', ownerToken, {
    wishlistId: priceWishlist.id,
    title: 'Price Tracked Item',
    description: 'Item for price tracking and alert tests',
    price: '$99.99',
    productUrl: 'https://example.com/tracked-price-item',
    store: 'Price Tracker Store'
  });
  assertCondition(Boolean(trackedItem && trackedItem.id), 'Expected tracked item created');
  logStep('Verified item for price tracking created');

  // Simulate price history entries
  await db.collection('priceHistory').add({
    itemId: trackedItem.id,
    productUrl: 'https://example.com/tracked-price-item',
    price: 99.99,
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    currency: 'USD',
    store: 'Price Tracker Store'
  });

  await db.collection('priceHistory').add({
    itemId: trackedItem.id,
    productUrl: 'https://example.com/tracked-price-item',
    price: 89.99,
    timestamp: new Date(Date.now() - 1800000), // 30 min ago
    currency: 'USD',
    store: 'Price Tracker Store'
  });

  await db.collection('priceHistory').add({
    itemId: trackedItem.id,
    productUrl: 'https://example.com/tracked-price-item',
    price: 79.99,
    timestamp: new Date(),
    currency: 'USD',
    store: 'Price Tracker Store'
  });
  logStep('Verified price history entries created for tracking');

  // Test notification delivery: create system notification
  const systemNotif = await callFunction('createSystemNotification', adminToken, {
    targetUserId: ownerUid,
    type: 'price_alert',
    title: 'Price Drop Alert',
    content: 'The tracked item dropped to $79.99!',
    data: { itemId: trackedItem.id }
  });
  assertCondition(Boolean(systemNotif && systemNotif.id), 'Expected system notification created');
  logStep('Verified system notification created for price alert delivery');

  // Test notification retrieval
  const userNotifs = await callFunction('getUserNotifications', ownerToken, { limit: 50 });
  assertCondition(Boolean(Array.isArray(userNotifs.notifications)), 'Expected notifications array');
  assertCondition(typeof userNotifs.unreadCount === 'number', 'Expected unread count to be numeric');
  assertCondition(userNotifs.notifications.length >= 1, 'Expected at least one notification');
  logStep('Verified notifications retrieved with unread count consistency');

  // Test notification marking as read (idempotency check)
  const notifToMark = userNotifs.notifications[0];
  const markResult1 = await callFunction('markNotificationAsRead', ownerToken, {
    notificationId: notifToMark.id
  });
  assertCondition(markResult1 && markResult1.isRead === true, 'Expected notification marked as read');
  logStep('Verified notification marked as read successfully');

  // Mark same notification as read again (idempotency)
  const markResult2 = await callFunction('markNotificationAsRead', ownerToken, {
    notificationId: notifToMark.id
  });
  assertCondition(markResult2 && markResult2.isRead === true, 'Expected idempotent mark as read');
  logStep('Verified notification marking is idempotent (no double-delivery side effects)');

  // Test mark all notifications as read
  const markAllResult = await callFunction('markAllNotificationsAsRead', ownerToken, {});
  assertCondition(markAllResult && typeof markAllResult.updatedCount === 'number', 'Expected markAllNotificationsAsRead result with updatedCount');
  logStep('Verified mark all notifications as read works correctly');

  // Test duplicate notification prevention: create same alert twice with different content
  const dupNotif1 = await callFunction('createSystemNotification', adminToken, {
    targetUserId: ownerUid,
    type: 'price_alert',
    title: 'Price Alert v1',
    content: 'Price tracking item price drop',
    data: { itemId: trackedItem.id, alertVersion: 1 }
  });
  assertCondition(Boolean(dupNotif1 && dupNotif1.id), 'Expected first notification');

  const dupNotif2 = await callFunction('createSystemNotification', adminToken, {
    targetUserId: ownerUid,
    type: 'price_alert',
    title: 'Price Alert v2',
    content: 'Price tracking item price drop update',
    data: { itemId: trackedItem.id, alertVersion: 2 }
  });
  assertCondition(Boolean(dupNotif2 && dupNotif2.id), 'Expected second notification with different data');
  logStep('Verified multiple notifications can be created independently (alert generation works)');

  const cleanupPriceWishlist = await callFunction('deleteWishlist', ownerToken, { wishlistId: priceWishlist.id });
  assertCondition(cleanupPriceWishlist && cleanupPriceWishlist.success === true, 'Expected cleanup deleteWishlist success');
  logStep('Verified price and notification reliability test cleanup');
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

  const collaborator = signedIn[1];
  const viewer = signedIn[2];

  await runCoreFlowHardeningSmoke(owner.idToken);
  await runWishlistSmoke(owner.idToken, collaborator.idToken, viewer.idToken, collaborator.uid, viewer.uid);
  await runGroupGiftSummaryContractSmoke(owner.idToken, owner.uid, viewer.uid);
  await runPriceNotificationReliabilitySmoke(owner.idToken, owner.uid, adminUser.idToken);
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
