const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'wishlist-wizard';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
const region = process.env.FUNCTIONS_REGION || 'us-central1';
const reportPath = process.env.SMOKE_REPORT_PATH || path.join('artifacts', 'smoke-all-functions-report.json');

process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const app = initializeApp({ projectId });
const auth = getAuth(app);

const report = {
  meta: {
    startedAt: new Date().toISOString(),
    projectId,
    authHost,
    functionsHost,
    region,
  },
  summary: {
    total: 0,
    passed: 0,
    warned: 0,
    failed: 0,
  },
  results: [],
};

const ACCEPTABLE_CALLABLE_ERROR_STATUSES = new Set([
  'INVALID_ARGUMENT',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'FAILED_PRECONDITION',
  'NOT_FOUND',
  'ALREADY_EXISTS',
]);

const ACCEPTABLE_HTTP_WARN_STATUS = new Set([400, 401, 403, 405, 409, 422, 501]);

const ENDPOINT_ALLOWED_ERROR_STATUSES = {
  createGroupPaymentIntent: new Set(['FAILED_PRECONDITION']),
  confirmGroupContribution: new Set(['FAILED_PRECONDITION', 'NOT_FOUND']),
  sendTestPushNotification: new Set(['NOT_FOUND', 'INTERNAL']),
  subscribeToTopic: new Set(['INTERNAL', 'NOT_FOUND']),
  unsubscribeFromTopic: new Set(['INTERNAL', 'NOT_FOUND']),
  connectCalendar: new Set(['FAILED_PRECONDITION']),
  updateCalendarConnectionSettings: new Set(['NOT_FOUND']),
  disconnectCalendar: new Set(['NOT_FOUND']),
  syncCalendarConnection: new Set(['NOT_FOUND']),
};

function writeReport() {
  const endedAt = new Date().toISOString();
  report.meta.endedAt = endedAt;
  report.meta.durationMs = new Date(endedAt).getTime() - new Date(report.meta.startedAt).getTime();

  const absolutePath = path.isAbsolute(reportPath)
    ? reportPath
    : path.join(process.cwd(), reportPath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2));
  console.log(`🧾 Function readiness report written to ${absolutePath}`);
}

async function signInWithPassword(email, password) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const payload = await response.json();
  if (!response.ok || payload.error) {
    const message = payload?.error?.message || response.statusText;
    throw new Error(`Auth sign-in failed for ${email}: ${message}`);
  }

  return { idToken: payload.idToken, localId: payload.localId };
}

async function seedAuthUser() {
  const testUser = {
    email: 'smoke-all-functions@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke All Functions',
  };

  try {
    const existing = await auth.getUserByEmail(testUser.email);
    await auth.deleteUser(existing.uid);
  } catch (error) {
    if (!error || error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  const created = await auth.createUser({
    email: testUser.email,
    password: testUser.password,
    displayName: testUser.displayName,
    emailVerified: true,
  });

  const signedIn = await signInWithPassword(testUser.email, testUser.password);
  return { ...testUser, uid: created.uid, ...signedIn };
}

function unwrapCallableResult(payload) {
  if (!payload || typeof payload !== 'object') return null;
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
  return null;
}

async function callCallableRaw(functionName, idToken, data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(`http://${functionsHost}/${projectId}/${region}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data: data || {} }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  return {
    response,
    payload,
    result: unwrapCallableResult(payload),
    errorStatus: payload?.error?.status,
    errorMessage: payload?.error?.message,
  };
}

async function callCallableExpectSuccess(functionName, idToken, data) {
  const outcome = await callCallableRaw(functionName, idToken, data);
  if (!outcome.response.ok || outcome.errorStatus) {
    throw new Error(`${functionName} fixture setup failed: ${outcome.errorStatus || outcome.response.status} ${outcome.errorMessage || ''}`.trim());
  }
  return outcome.result;
}

async function buildFixtureContext(testUser) {
  const adminUser = await seedAdminUser();
  const ctx = {
    user: testUser,
    admin: adminUser,
    ids: {
      wishlistId: null,
      wishlistShareId: null,
      itemId: null,
      extensionDeleteItemId: null,
      notificationId: null,
      calendarEventId: null,
      deviceId: null,
      crudDocId: null,
      batchDocIds: [],
    },
  };

  await callCallableExpectSuccess('createUserProfile', testUser.idToken, {
    userId: testUser.uid,
    email: testUser.email,
    displayName: testUser.displayName,
  });

  const wishlist = await callCallableExpectSuccess('createWishlist', testUser.idToken, {
    name: 'Smoke Fixture Wishlist',
    description: 'Fixture wishlist for contract smoke tests',
    isPublic: true,
    isCollaborative: true,
  });
  ctx.ids.wishlistId = wishlist?.id || null;
  ctx.ids.wishlistShareId = wishlist?.shareId || null;

  if (ctx.ids.wishlistId) {
    const item = await callCallableExpectSuccess('addWishlistItem', testUser.idToken, {
      wishlistId: ctx.ids.wishlistId,
      title: 'Smoke Fixture Item',
      description: 'Fixture item',
      productUrl: 'https://www.amazon.com/dp/B000000000',
      price: '$19.99',
      store: 'Fixture Store',
      priority: 1,
    });
    ctx.ids.itemId = item?.id || null;

    const extensionDeleteItem = await callCallableExpectSuccess('addWishlistItem', testUser.idToken, {
      wishlistId: ctx.ids.wishlistId,
      title: 'Smoke Extension Delete Item',
      productUrl: 'https://www.amazon.com/dp/B000000005',
      price: '$7.99',
      store: 'Fixture Store',
      priority: 1,
    });
    ctx.ids.extensionDeleteItemId = extensionDeleteItem?.id || null;
  }

  const notification = await callCallableExpectSuccess('createSystemNotification', adminUser.idToken, {
    targetUserId: testUser.uid,
    type: 'smoke_fixture',
    title: 'Fixture Notification',
    content: 'Fixture notification content',
    data: { source: 'smoke-fixture' },
  });
  ctx.ids.notificationId = notification?.id || null;

  const calendarEvent = await callCallableExpectSuccess('createCalendarEvent', testUser.idToken, {
    title: 'Fixture Calendar Event',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    allDay: false,
    type: 'reminder',
  });
  ctx.ids.calendarEventId = calendarEvent?.id || null;

  const device = await callCallableExpectSuccess('registerDevice', testUser.idToken, {
    deviceType: 'web',
    deviceToken: 'fixture-device-token',
    deviceName: 'Smoke Device',
    osType: 'macOS',
    osVersion: '14',
    appVersion: '1.0.0',
  });
  ctx.ids.deviceId = device?.deviceId || null;

  await callCallableExpectSuccess('saveFCMToken', testUser.idToken, {
    token: 'fcm_fixture_token',
    platform: 'web',
  });

  const crudDoc = await callCallableExpectSuccess('createDocument', testUser.idToken, {
    collection: 'smokeCrud',
    data: { label: 'fixture-doc', createdBy: testUser.uid },
  });
  ctx.ids.crudDocId = crudDoc?.id || null;

  const batchCreated = await callCallableExpectSuccess('batchCreateDocuments', testUser.idToken, {
    collection: 'smokeCrud',
    documents: [
      { label: 'batch-1' },
      { label: 'batch-2' },
    ],
  });
  ctx.ids.batchDocIds = Array.isArray(batchCreated?.data)
    ? batchCreated.data.map(entry => entry.id).filter(Boolean)
    : [];

  return ctx;
}

async function seedAdminUser() {
  const adminUser = {
    email: 'smoke-admin-functions@wishlist-wizard.test',
    password: 'SmokePass123!',
    displayName: 'Smoke Admin Functions',
  };

  try {
    const existing = await auth.getUserByEmail(adminUser.email);
    await auth.deleteUser(existing.uid);
  } catch (error) {
    if (!error || error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  const created = await auth.createUser({
    email: adminUser.email,
    password: adminUser.password,
    displayName: adminUser.displayName,
    emailVerified: true,
  });

  await auth.setCustomUserClaims(created.uid, {
    admin: true,
    role: 'admin',
  });

  const signedIn = await signInWithPassword(adminUser.email, adminUser.password);
  return { ...adminUser, uid: created.uid, ...signedIn };
}

function recordOutcome(endpoint, type, outcome) {
  report.results.push({ endpoint, type, ...outcome });
  report.summary.total += 1;
  report.summary[outcome.status] += 1;
  const icon = outcome.status === 'passed' ? '✅' : outcome.status === 'warned' ? '⚠️' : '❌';
  console.log(`${icon} ${endpoint} (${type}) - ${outcome.message}`);
}

async function runAnalyticsAccessContractChecks(fixtureContext) {
  const checks = [];

  const unauthSummary = await callCallableRaw('getAnalyticsSummary', null, { windowDays: 7 });
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:unauthenticated',
    type: 'contract',
    ...(unauthSummary.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated analytics summary access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthSummary.errorStatus || unauthSummary.response.status}`,
          httpStatus: unauthSummary.response.status,
        }),
  });

  const unauthEvents = await callCallableRaw('getAnalyticsEvents', null, { limit: 5 });
  checks.push({
    endpoint: 'contract:getAnalyticsEvents:unauthenticated',
    type: 'contract',
    ...(unauthEvents.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated analytics events access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthEvents.errorStatus || unauthEvents.response.status}`,
          httpStatus: unauthEvents.response.status,
        }),
  });

  const nonAdminGlobal = await callCallableRaw('getAnalyticsSummary', fixtureContext.user.idToken, {
    includeGlobal: true,
    windowDays: 7,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:nonadmin-global-denied',
    type: 'contract',
    ...(nonAdminGlobal.errorStatus === 'PERMISSION_DENIED'
      ? { status: 'passed', message: 'Non-admin global analytics access correctly denied' }
      : {
          status: 'failed',
          message: `Expected PERMISSION_DENIED, got ${nonAdminGlobal.errorStatus || nonAdminGlobal.response.status}`,
          httpStatus: nonAdminGlobal.response.status,
        }),
  });

  const adminUser = await seedAdminUser();
  const adminGlobal = await callCallableRaw('getAnalyticsSummary', adminUser.idToken, {
    includeGlobal: true,
    windowDays: 7,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:admin-global-allowed',
    type: 'contract',
    ...(!adminGlobal.errorStatus && adminGlobal.response.ok
      ? { status: 'passed', message: 'Admin global analytics summary access allowed' }
      : {
          status: 'failed',
          message: `Expected success, got ${adminGlobal.errorStatus || adminGlobal.response.status}`,
          httpStatus: adminGlobal.response.status,
        }),
  });

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function runAnalyticsNormalizationContractChecks(fixtureContext) {
  const checks = [];

  const highWindow = await callCallableRaw('getAnalyticsSummary', fixtureContext.user.idToken, {
    windowDays: 9999,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:window-max-clamped',
    type: 'contract',
    ...(!highWindow.errorStatus
      && highWindow.response.ok
      && highWindow.result?.summary
      && highWindow.result.summary.windowDays === 365
      ? { status: 'passed', message: 'Analytics summary windowDays is clamped to max (365)' }
      : {
          status: 'failed',
          message: `Expected windowDays=365, got ${highWindow.result?.summary?.windowDays ?? highWindow.errorStatus ?? highWindow.response.status}`,
          httpStatus: highWindow.response.status,
        }),
  });

  const lowWindow = await callCallableRaw('getAnalyticsSummary', fixtureContext.user.idToken, {
    windowDays: -1,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:window-default-fallback',
    type: 'contract',
    ...(!lowWindow.errorStatus
      && lowWindow.response.ok
      && lowWindow.result?.summary
      && lowWindow.result.summary.windowDays === 30
      ? { status: 'passed', message: 'Analytics summary windowDays falls back to default (30)' }
      : {
          status: 'failed',
          message: `Expected windowDays=30, got ${lowWindow.result?.summary?.windowDays ?? lowWindow.errorStatus ?? lowWindow.response.status}`,
          httpStatus: lowWindow.response.status,
        }),
  });

  const zeroLimit = await callCallableRaw('getAnalyticsEvents', fixtureContext.user.idToken, {
    limit: 0,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsEvents:limit-default-fallback',
    type: 'contract',
    ...(!zeroLimit.errorStatus && zeroLimit.response.ok && Array.isArray(zeroLimit.result?.events)
      ? { status: 'passed', message: 'Analytics events limit=0 falls back to default without failure' }
      : {
          status: 'failed',
          message: `Expected successful fallback for limit=0, got ${zeroLimit.errorStatus || zeroLimit.response.status}`,
          httpStatus: zeroLimit.response.status,
        }),
  });

  const highLimit = await callCallableRaw('getAnalyticsEvents', fixtureContext.user.idToken, {
    limit: 5000,
  });
  checks.push({
    endpoint: 'contract:getAnalyticsEvents:limit-max-clamped',
    type: 'contract',
    ...(!highLimit.errorStatus && highLimit.response.ok && Array.isArray(highLimit.result?.events)
      ? { status: 'passed', message: 'Analytics events high limit is accepted and normalized without failure' }
      : {
          status: 'failed',
          message: `Expected successful normalization for high limit, got ${highLimit.errorStatus || highLimit.response.status}`,
          httpStatus: highLimit.response.status,
        }),
  });

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function runNotificationAccessContractChecks(fixtureContext) {
  const checks = [];
  const systemNotificationPayload = {
    targetUserId: fixtureContext.user.uid,
    type: 'contract_system_notification',
    title: 'Contract System Notification',
    content: 'Contract content',
  };

  const unauthSystemNotification = await callCallableRaw('createSystemNotification', null, systemNotificationPayload);
  checks.push({
    endpoint: 'contract:createSystemNotification:unauthenticated',
    type: 'contract',
    ...(unauthSystemNotification.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated system notification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthSystemNotification.errorStatus || unauthSystemNotification.response.status}`,
          httpStatus: unauthSystemNotification.response.status,
        }),
  });

  const nonAdminSystemNotification = await callCallableRaw('createSystemNotification', fixtureContext.user.idToken, systemNotificationPayload);
  checks.push({
    endpoint: 'contract:createSystemNotification:nonadmin-denied',
    type: 'contract',
    ...(nonAdminSystemNotification.errorStatus === 'PERMISSION_DENIED'
      ? { status: 'passed', message: 'Non-admin system notification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected PERMISSION_DENIED, got ${nonAdminSystemNotification.errorStatus || nonAdminSystemNotification.response.status}`,
          httpStatus: nonAdminSystemNotification.response.status,
        }),
  });

  const adminSystemNotification = await callCallableRaw('createSystemNotification', fixtureContext.admin.idToken, systemNotificationPayload);
  checks.push({
    endpoint: 'contract:createSystemNotification:admin-allowed',
    type: 'contract',
    ...(!adminSystemNotification.errorStatus && adminSystemNotification.response.ok
      ? { status: 'passed', message: 'Admin system notification access allowed' }
      : {
          status: 'failed',
          message: `Expected success, got ${adminSystemNotification.errorStatus || adminSystemNotification.response.status}`,
          httpStatus: adminSystemNotification.response.status,
        }),
  });

  const unauthCleanup = await callCallableRaw('cleanOldNotifications', null, {});
  checks.push({
    endpoint: 'contract:cleanOldNotifications:unauthenticated',
    type: 'contract',
    ...(unauthCleanup.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated cleanOldNotifications access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthCleanup.errorStatus || unauthCleanup.response.status}`,
          httpStatus: unauthCleanup.response.status,
        }),
  });

  const nonAdminCleanup = await callCallableRaw('cleanOldNotifications', fixtureContext.user.idToken, {});
  checks.push({
    endpoint: 'contract:cleanOldNotifications:nonadmin-denied',
    type: 'contract',
    ...(nonAdminCleanup.errorStatus === 'PERMISSION_DENIED'
      ? { status: 'passed', message: 'Non-admin cleanOldNotifications access correctly denied' }
      : {
          status: 'failed',
          message: `Expected PERMISSION_DENIED, got ${nonAdminCleanup.errorStatus || nonAdminCleanup.response.status}`,
          httpStatus: nonAdminCleanup.response.status,
        }),
  });

  const adminCleanup = await callCallableRaw('cleanOldNotifications', fixtureContext.admin.idToken, {});
  checks.push({
    endpoint: 'contract:cleanOldNotifications:admin-allowed',
    type: 'contract',
    ...(!adminCleanup.errorStatus && adminCleanup.response.ok
      ? { status: 'passed', message: 'Admin cleanOldNotifications access allowed' }
      : {
          status: 'failed',
          message: `Expected success, got ${adminCleanup.errorStatus || adminCleanup.response.status}`,
          httpStatus: adminCleanup.response.status,
        }),
  });

  const payload = {
    userIds: [fixtureContext.user.uid],
    notification: {
      title: 'Contract Batch Notification',
      body: 'Batch contract payload',
    },
  };

  const unauthBatch = await callCallableRaw('sendBatchNotification', null, payload);
  checks.push({
    endpoint: 'contract:sendBatchNotification:unauthenticated',
    type: 'contract',
    ...(unauthBatch.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated batch notification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthBatch.errorStatus || unauthBatch.response.status}`,
          httpStatus: unauthBatch.response.status,
        }),
  });

  const nonAdminBatch = await callCallableRaw('sendBatchNotification', fixtureContext.user.idToken, payload);
  checks.push({
    endpoint: 'contract:sendBatchNotification:nonadmin-denied',
    type: 'contract',
    ...(nonAdminBatch.errorStatus === 'PERMISSION_DENIED'
      ? { status: 'passed', message: 'Non-admin batch notification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected PERMISSION_DENIED, got ${nonAdminBatch.errorStatus || nonAdminBatch.response.status}`,
          httpStatus: nonAdminBatch.response.status,
        }),
  });

  const adminBatch = await callCallableRaw('sendBatchNotification', fixtureContext.admin.idToken, payload);
  const adminBatchResult = adminBatch.result;
  const hasValidBatchShape =
    adminBatchResult
    && typeof adminBatchResult === 'object'
    && ['success', 'partial', 'failure'].includes(adminBatchResult.status)
    && typeof adminBatchResult.attempted === 'number'
    && typeof adminBatchResult.sent === 'number'
    && typeof adminBatchResult.skipped === 'number'
    && typeof adminBatchResult.failed === 'number'
    && adminBatchResult.attempted === payload.userIds.length
    && (adminBatchResult.sent + adminBatchResult.skipped + adminBatchResult.failed) === adminBatchResult.attempted;
  checks.push({
    endpoint: 'contract:sendBatchNotification:admin-allowed',
    type: 'contract',
    ...(!adminBatch.errorStatus && adminBatch.response.ok && hasValidBatchShape
      ? { status: 'passed', message: 'Admin batch notification access returns explicit delivery status and counts' }
      : {
          status: 'failed',
          message: `Expected semantic batch status response, got ${adminBatch.errorStatus || adminBatch.response.status}`,
          httpStatus: adminBatch.response.status,
        }),
  });

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function runFcmAccessContractChecks(fixtureContext) {
  const checks = [];

  const unauthSubscribe = await callCallableRaw('subscribeToTopic', null, { topic: 'smoke-contract-topic' });
  checks.push({
    endpoint: 'contract:subscribeToTopic:unauthenticated',
    type: 'contract',
    ...(unauthSubscribe.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated subscribeToTopic access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthSubscribe.errorStatus || unauthSubscribe.response.status}`,
          httpStatus: unauthSubscribe.response.status,
        }),
  });

  const invalidSubscribe = await callCallableRaw('subscribeToTopic', fixtureContext.user.idToken, { topic: '' });
  checks.push({
    endpoint: 'contract:subscribeToTopic:invalid-argument',
    type: 'contract',
    ...(invalidSubscribe.errorStatus === 'INVALID_ARGUMENT'
      ? { status: 'passed', message: 'subscribeToTopic invalid argument correctly rejected' }
      : {
          status: 'failed',
          message: `Expected INVALID_ARGUMENT, got ${invalidSubscribe.errorStatus || invalidSubscribe.response.status}`,
          httpStatus: invalidSubscribe.response.status,
        }),
  });

  const unauthUnsubscribe = await callCallableRaw('unsubscribeFromTopic', null, { topic: 'smoke-contract-topic' });
  checks.push({
    endpoint: 'contract:unsubscribeFromTopic:unauthenticated',
    type: 'contract',
    ...(unauthUnsubscribe.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated unsubscribeFromTopic access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthUnsubscribe.errorStatus || unauthUnsubscribe.response.status}`,
          httpStatus: unauthUnsubscribe.response.status,
        }),
  });

  const invalidUnsubscribe = await callCallableRaw('unsubscribeFromTopic', fixtureContext.user.idToken, { topic: '' });
  checks.push({
    endpoint: 'contract:unsubscribeFromTopic:invalid-argument',
    type: 'contract',
    ...(invalidUnsubscribe.errorStatus === 'INVALID_ARGUMENT'
      ? { status: 'passed', message: 'unsubscribeFromTopic invalid argument correctly rejected' }
      : {
          status: 'failed',
          message: `Expected INVALID_ARGUMENT, got ${invalidUnsubscribe.errorStatus || invalidUnsubscribe.response.status}`,
          httpStatus: invalidUnsubscribe.response.status,
        }),
  });

  const unauthTestPush = await callCallableRaw('sendTestPushNotification', null, {
    title: 'Contract Push',
    body: 'Contract push body',
  });
  checks.push({
    endpoint: 'contract:sendTestPushNotification:unauthenticated',
    type: 'contract',
    ...(unauthTestPush.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated sendTestPushNotification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthTestPush.errorStatus || unauthTestPush.response.status}`,
          httpStatus: unauthTestPush.response.status,
        }),
  });

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function createTempWishlist(ctx) {
  const created = await callCallableExpectSuccess('createWishlist', ctx.user.idToken, {
    name: `Temp Wishlist ${Date.now()}`,
    isPublic: false,
    isCollaborative: false,
  });
  return created?.id || null;
}

async function createTempItem(ctx, wishlistId) {
  const created = await callCallableExpectSuccess('addWishlistItem', ctx.user.idToken, {
    wishlistId,
    title: `Temp Item ${Date.now()}`,
    price: '$9.99',
    store: 'Temp',
    priority: 1,
  });
  return created?.id || null;
}

async function resolveCallablePayload(functionName, ctx) {
  const uid = ctx.user.uid;

  switch (functionName) {
    case 'createUserProfile':
      return { userId: uid, email: ctx.user.email, displayName: ctx.user.displayName };
    case 'getUserProfile':
      return { userId: uid };
    case 'updateUserProfile':
      return { userId: uid, updates: { displayName: 'Smoke Updated User' } };

    case 'createDocument':
      return { collection: 'smokeCrud', data: { label: 'new-doc', ts: Date.now() } };
    case 'getDocument':
      return { collection: 'smokeCrud', documentId: ctx.ids.crudDocId };
    case 'updateDocument':
      return { collection: 'smokeCrud', documentId: ctx.ids.crudDocId, data: { label: 'updated-doc' } };
    case 'deleteDocument': {
      const doc = await callCallableExpectSuccess('createDocument', ctx.user.idToken, {
        collection: 'smokeCrud',
        data: { label: 'delete-me' },
      });
      return { collection: 'smokeCrud', documentId: doc?.id };
    }
    case 'listDocuments':
      return { collection: 'smokeCrud', limit: 20 };
    case 'batchCreateDocuments':
      return { collection: 'smokeCrud', documents: [{ label: 'bulk-a' }, { label: 'bulk-b' }] };
    case 'batchUpdateDocuments':
      return {
        collection: 'smokeCrud',
        updates: ctx.ids.batchDocIds.slice(0, 2).map((id, index) => ({ id, data: { batchUpdated: true, index } })),
      };

    case 'markNotificationAsRead':
      return { notificationId: ctx.ids.notificationId };
    case 'deleteNotification': {
      const note = await callCallableExpectSuccess('createSystemNotification', ctx.admin.idToken, {
        targetUserId: uid,
        type: 'smoke_delete',
        title: 'Delete me',
        content: 'temp',
      });
      return { notificationId: note?.id };
    }
    case 'createSystemNotification':
      return {
        targetUserId: uid,
        type: 'smoke_contract',
        title: 'Contract Notification',
        content: 'Contract payload',
      };
    case 'updateNotificationSettings':
      return { settings: { email: true, push: true, priceAlerts: true, wishlistUpdates: true, collaborationUpdates: true, marketingEmails: false } };

    case 'addItemFromExtension':
      return { wishlistId: ctx.ids.wishlistId, title: 'Extension Contract Item', productUrl: 'https://www.target.com/p/example' };
    case 'getExtensionRecentItems':
      return { limit: 10 };
    case 'createExtensionWishlist':
      return { name: 'Contract Extension Wishlist' };
    case 'deleteExtensionItem': {
      const tempItemId = await createTempItem(ctx, ctx.ids.wishlistId);
      return { itemId: tempItemId };
    }
    case 'shareExtensionWishlist':
      return { wishlistId: ctx.ids.wishlistId };
    case 'trackExtensionEvent':
      return { action: 'smoke_contract_event', category: 'smoke', label: 'extension', value: 1 };

    case 'getWishlistById':
      return { wishlistId: ctx.ids.wishlistId };
    case 'getSharedWishlist':
      return { shareId: ctx.ids.wishlistShareId };
    case 'createWishlist':
      return { name: `Contract Wishlist ${Date.now()}`, isPublic: false, isCollaborative: false };
    case 'updateWishlist':
      return { wishlistId: ctx.ids.wishlistId, name: 'Smoke Fixture Wishlist Updated' };
    case 'deleteWishlist': {
      const tempWishlistId = await createTempWishlist(ctx);
      return { wishlistId: tempWishlistId };
    }
    case 'getWishlistItems':
      return { wishlistId: ctx.ids.wishlistId };
    case 'addWishlistItem':
      return { wishlistId: ctx.ids.wishlistId, title: 'Contract Add Item', productUrl: 'https://www.amazon.com/dp/B000000001', price: '$11.99', store: 'Contract Store' };
    case 'updateWishlistItem':
      return { itemId: ctx.ids.itemId, updates: { note: 'Contract update note' } };
    case 'deleteWishlistItem': {
      const tempItemId = await createTempItem(ctx, ctx.ids.wishlistId);
      return { itemId: tempItemId };
    }

    case 'saveFCMToken':
      return { token: 'fcm_contract_token', platform: 'web' };
    case 'subscribeToTopic':
    case 'unsubscribeFromTopic':
      return { topic: 'smoke-contract-topic' };
    case 'sendTestPushNotification':
      return { title: 'Contract Push', body: 'Push test' };
    case 'sendBatchNotification':
      return { userIds: [uid], notification: { title: 'Batch Contract', body: 'Batch notification body' } };

    case 'convertAffiliateLink':
      return { url: 'https://www.amazon.com/dp/B000000002' };
    case 'batchConvertAffiliateLinks':
      return { urls: ['https://www.amazon.com/dp/B000000003', 'https://www.target.com/p/example-product'] };
    case 'convertWishlistAffiliateLinks':
      return { wishlistId: ctx.ids.wishlistId };
    case 'trackAffiliateClick':
      return { url: 'https://www.amazon.com/dp/B000000004', program: 'Amazon Associates' };

    case 'createGroupPaymentIntent':
      return { itemId: ctx.ids.itemId, amount: 5, message: 'Contract contribution' };
    case 'confirmGroupContribution':
      return { contributionId: 'contract-fixture-contribution' };
    case 'getGroupGiftSummary':
      return { itemId: ctx.ids.itemId };

    case 'createCalendarEvent':
      return { title: 'Contract Calendar Event', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 3600000).toISOString(), allDay: false };
    case 'updateCalendarEvent':
      return { eventId: ctx.ids.calendarEventId, updates: { title: 'Contract Calendar Event Updated' } };
    case 'deleteCalendarEvent': {
      const tempEvent = await callCallableExpectSuccess('createCalendarEvent', ctx.user.idToken, {
        title: `Delete Event ${Date.now()}`,
        startDate: new Date().toISOString(),
      });
      return { eventId: tempEvent?.id };
    }
    case 'getCalendarAuthUrl':
      return { provider: 'apple' };
    case 'connectCalendar':
      return { provider: 'apple', code: 'manual-subscription' };
    case 'updateCalendarConnectionSettings':
      return { connectionId: 'missing-connection-id', settings: { syncEvents: true } };
    case 'disconnectCalendar':
      return { connectionId: 'missing-connection-id' };
    case 'syncCalendarConnection':
      return { connectionId: 'missing-connection-id' };

    case 'registerDevice':
      return { deviceType: 'web', deviceToken: 'contract-device-token', deviceName: 'Contract Device', osType: 'macOS', osVersion: '14', appVersion: '1.0.0' };
    case 'updateDevice':
      return { deviceId: ctx.ids.deviceId, updates: { appVersion: '1.0.1' } };
    case 'logSyncEvent':
      return { deviceId: ctx.ids.deviceId, entityType: 'wishlist', entityId: ctx.ids.wishlistId, action: 'updated' };
    case 'syncMobileActions':
      return { deviceId: ctx.ids.deviceId, offlineActions: [{ type: 'item_added', barcode: '1234567890123' }] };

    case 'lookupBarcode':
      return { barcode: '737628064502' };
    case 'trackAnalyticsEvent':
      return { action: 'smoke_contract_action', category: 'smoke', label: 'contract', value: 1 };

    default:
      return {};
  }
}

function resolveHttpRequest(functionName, ctx) {
  const authorizedHeaders = {
    Authorization: `Bearer ${ctx.user.idToken}`,
  };

  if (functionName === 'extensionGetWishlists') {
    return {
      method: 'GET',
      pathSuffix: '',
      headers: authorizedHeaders,
    };
  }

  if (functionName === 'extensionCreateWishlist') {
    return {
      method: 'POST',
      pathSuffix: '',
      headers: authorizedHeaders,
      body: { name: `Smoke HTTP Wishlist ${Date.now()}`, description: 'HTTP smoke coverage' },
    };
  }

  if (functionName === 'extensionAddItem') {
    return {
      method: 'POST',
      pathSuffix: '',
      headers: authorizedHeaders,
      body: {
        wishlistId: ctx.ids.wishlistId,
        title: 'Smoke HTTP Extension Item',
        productUrl: 'https://www.amazon.com/dp/B000000006',
        price: '$12.50',
        store: 'HTTP Smoke Store',
      },
    };
  }

  if (functionName === 'extensionGetRecentItems') {
    return {
      method: 'GET',
      pathSuffix: '',
      headers: authorizedHeaders,
    };
  }

  if (functionName === 'extensionGetWishlistItems') {
    return {
      method: 'GET',
      pathSuffix: `/api/extension/wishlists/${ctx.ids.wishlistId}/items`,
      headers: authorizedHeaders,
    };
  }

  if (functionName === 'extensionDeleteItem') {
    return {
      method: 'DELETE',
      pathSuffix: `/api/extension/items/${ctx.ids.extensionDeleteItemId}`,
      headers: authorizedHeaders,
    };
  }

  if (functionName === 'extensionShareWishlist') {
    return {
      method: 'POST',
      pathSuffix: `/api/extension/wishlists/${ctx.ids.wishlistId}/share`,
      headers: authorizedHeaders,
      body: {},
    };
  }

  if (functionName === 'api') {
    return {
      method: 'GET',
      pathSuffix: '/api/extension/wishlists',
      headers: authorizedHeaders,
    };
  }

  if (functionName === 'getItemPriceHistory') {
    const query = new URLSearchParams({ itemId: String(ctx.ids.itemId || '') }).toString();
    return {
      method: 'GET',
      pathSuffix: `?${query}`,
      headers: authorizedHeaders,
    };
  }

  return {
    method: 'POST',
    pathSuffix: '',
    headers: {},
    body: {},
  };
}

function parseExportedFunctions() {
  const indexPath = path.join(process.cwd(), 'packages/functions/src/index.ts');
  const indexSource = fs.readFileSync(indexPath, 'utf8');
  const exportBlocks = [...indexSource.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*'([^']+)'\s*;/g)];

  const exported = [];

  for (const block of exportBlocks) {
    const namesRaw = block[1];
    const modulePath = block[2];
    const names = namesRaw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.replace(/\s+as\s+\w+$/, '').trim());

    for (const name of names) {
      exported.push({ name, modulePath });
    }
  }

  return exported;
}

function classifyFunction(modulePath, name) {
  const moduleRel = modulePath.replace(/^\.\//, '');
  const directSourcePath = path.join(process.cwd(), 'packages/functions/src', `${moduleRel}.ts`);
  const indexSourcePath = path.join(process.cwd(), 'packages/functions/src', moduleRel, 'index.ts');

  const sourcePath = fs.existsSync(directSourcePath)
    ? directSourcePath
    : fs.existsSync(indexSourcePath)
      ? indexSourcePath
      : null;

  if (!sourcePath) {
    return 'unknown';
  }

  const source = fs.readFileSync(sourcePath, 'utf8');
  const onCallPattern = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*onCall\\b`);
  const onRequestPattern = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*onRequest\\b`);

  if (onCallPattern.test(source)) return 'onCall';
  if (onRequestPattern.test(source)) return 'onRequest';
  return 'unknown';
}

async function invokeCallable(functionName, idToken, data) {
  const started = Date.now();
  try {
    const responseData = await callCallableRaw(functionName, idToken, data);
    const { response, errorStatus, errorMessage } = responseData;

    const endpointAllowedStatuses = ENDPOINT_ALLOWED_ERROR_STATUSES[functionName];
    const allowedStatuses = endpointAllowedStatuses || ACCEPTABLE_CALLABLE_ERROR_STATUSES;

    if (errorStatus) {
      if (allowedStatuses.has(errorStatus) || ACCEPTABLE_CALLABLE_ERROR_STATUSES.has(errorStatus)) {
        return {
          status: 'warned',
          durationMs: Date.now() - started,
          httpStatus: response.status,
          message: `${errorStatus}: ${errorMessage || 'expected validation/auth guard'}`,
        };
      }

      return {
        status: 'failed',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: `${errorStatus}: ${errorMessage || 'unexpected callable error'}`,
      };
    }

    if (response.status === 403 || response.status === 404) {
      return {
        status: 'failed',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: `Endpoint inaccessible (${response.status})`,
      };
    }

    if (!response.ok || response.status >= 500) {
      return {
        status: 'failed',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: `Unexpected HTTP status ${response.status}`,
      };
    }

    return {
      status: 'passed',
      durationMs: Date.now() - started,
      httpStatus: response.status,
      message: 'Callable reachable',
    };
  } catch (error) {
    return {
      status: 'failed',
      durationMs: Date.now() - started,
      message: error?.message || String(error),
    };
  }
}

async function invokeHttp(functionName, requestConfig = { method: 'POST', headers: {}, body: {}, pathSuffix: '' }) {
  const started = Date.now();
  try {
    const response = await fetch(`http://${functionsHost}/${projectId}/${region}/${functionName}${requestConfig.pathSuffix || ''}`, {
      method: requestConfig.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestConfig.headers || {}),
      },
      ...(requestConfig.method && requestConfig.method.toUpperCase() === 'GET'
        ? {}
        : { body: JSON.stringify(requestConfig.body || {}) }),
    });

    if (response.status === 404) {
      return {
        status: 'failed',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: 'HTTP endpoint not found',
      };
    }

    if (response.status >= 500 && response.status !== 501) {
      return {
        status: 'failed',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: `Server error ${response.status}`,
      };
    }

    if (ACCEPTABLE_HTTP_WARN_STATUS.has(response.status)) {
      return {
        status: 'warned',
        durationMs: Date.now() - started,
        httpStatus: response.status,
        message: `HTTP ${response.status} (reachable but not fully configured for this payload)`,
      };
    }

    return {
      status: 'passed',
      durationMs: Date.now() - started,
      httpStatus: response.status,
      message: 'HTTP endpoint reachable',
    };
  } catch (error) {
    return {
      status: 'failed',
      durationMs: Date.now() - started,
      message: error?.message || String(error),
    };
  }
}

async function main() {
  console.log('🧪 Running comprehensive function readiness smoke test...');

  const exported = parseExportedFunctions();
  const endpointEntries = exported.map(entry => ({
    ...entry,
    type: classifyFunction(entry.modulePath, entry.name),
  }));

  const unknown = endpointEntries.filter(entry => entry.type === 'unknown');
  if (unknown.length > 0) {
    console.warn(`⚠️ ${unknown.length} exports could not be classified as onCall/onRequest`);
  }

  const callableEntries = endpointEntries.filter(entry => entry.type === 'onCall');
  const requestEntries = endpointEntries.filter(entry => entry.type === 'onRequest');

  const testUser = await seedAuthUser();
  console.log(`✅ Seeded and authenticated smoke user ${testUser.email}`);

  const fixtureContext = await buildFixtureContext(testUser);
  console.log('✅ Prepared fixture data for contract payload validation');

  await runAnalyticsAccessContractChecks(fixtureContext);
  await runAnalyticsNormalizationContractChecks(fixtureContext);
  await runNotificationAccessContractChecks(fixtureContext);
  await runFcmAccessContractChecks(fixtureContext);

  const adminCallableNames = new Set(['createSystemNotification', 'sendBatchNotification', 'cleanOldNotifications']);

  for (const entry of callableEntries) {
    const payload = await resolveCallablePayload(entry.name, fixtureContext);
    const idToken = adminCallableNames.has(entry.name)
      ? fixtureContext.admin.idToken
      : testUser.idToken;
    const outcome = await invokeCallable(entry.name, idToken, payload);
    recordOutcome(entry.name, entry.type, outcome);
  }

  for (const entry of requestEntries) {
    const requestConfig = resolveHttpRequest(entry.name, fixtureContext);
    const outcome = await invokeHttp(entry.name, requestConfig);
    recordOutcome(entry.name, entry.type, outcome);
  }

  if (unknown.length > 0) {
    for (const entry of unknown) {
      report.results.push({
        endpoint: entry.name,
        type: 'unknown',
        status: 'warned',
        message: `Could not classify export from ${entry.modulePath}`,
      });
      report.summary.total += 1;
      report.summary.warned += 1;
    }
  }

  writeReport();

  console.log(
    `📊 Completed: total=${report.summary.total}, passed=${report.summary.passed}, warned=${report.summary.warned}, failed=${report.summary.failed}`
  );

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('❌ Comprehensive smoke test failed to run', error);
  report.summary.failed += 1;
  report.results.push({
    endpoint: '__runner__',
    type: 'meta',
    status: 'failed',
    message: error?.message || String(error),
  });
  writeReport();
  process.exitCode = 1;
});
