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

function parseBooleanEnv(value) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

const treatExpectedDependencyGapsAsPass = parseBooleanEnv(process.env.SMOKE_TREAT_EXPECTED_DEPENDENCY_GAPS_AS_PASS);

const CALLABLE_DEPENDENCY_GAP_RULES = {
  subscribeToTopic: {
    statuses: new Set(['INTERNAL']),
    messageIncludes: ['Failed to subscribe to topic'],
  },
  unsubscribeFromTopic: {
    statuses: new Set(['INTERNAL']),
    messageIncludes: ['Failed to unsubscribe from topic'],
  },
  sendTestPushNotification: {
    statuses: new Set(['INTERNAL', 'NOT_FOUND']),
    messageIncludes: ['Failed to send test notification', 'No FCM token found'],
  },
  createGroupPaymentIntent: {
    statuses: new Set(['FAILED_PRECONDITION']),
    messageIncludes: ['Stripe is not configured'],
  },
  confirmGroupContribution: {
    statuses: new Set(['FAILED_PRECONDITION']),
    messageIncludes: ['Stripe is not configured'],
  },
};

const HTTP_DEPENDENCY_GAP_RULES = {
  createCheckoutSession: {
    statuses: new Set([501]),
    messageIncludes: ['Stripe not configured'],
  },
  stripeWebhook: {
    statuses: new Set([501]),
    messageIncludes: ['Stripe webhook not configured'],
  },
};

function matchesDependencyGapRule(rule, status, message) {
  if (!rule) return false;
  if (!rule.statuses.has(status)) return false;
  const normalizedMessage = String(message || '').toLowerCase();
  return rule.messageIncludes.some(fragment => normalizedMessage.includes(fragment.toLowerCase()));
}

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
  report.meta.treatExpectedDependencyGapsAsPass = treatExpectedDependencyGapsAsPass;

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

  const missingAction = await callCallableRaw('trackAnalyticsEvent', fixtureContext.user.idToken, {
    category: 'smoke',
    label: 'missing-action',
  });
  checks.push({
    endpoint: 'contract:trackAnalyticsEvent:missing-action-rejected',
    type: 'contract',
    ...(missingAction.errorStatus === 'INVALID_ARGUMENT'
      ? { status: 'passed', message: 'Analytics tracking requires action and rejects invalid payloads' }
      : {
          status: 'failed',
          message: `Expected INVALID_ARGUMENT, got ${missingAction.errorStatus || missingAction.response.status}`,
          httpStatus: missingAction.response.status,
        }),
  });

  const trackedEvent = await callCallableRaw('trackAnalyticsEvent', fixtureContext.user.idToken, {
    action: 'contract_shape_event',
    category: 'smoke',
    label: 'normalization-check',
    value: 1,
  });
  checks.push({
    endpoint: 'contract:trackAnalyticsEvent:valid-payload-accepted',
    type: 'contract',
    ...(!trackedEvent.errorStatus && trackedEvent.response.ok && trackedEvent.result?.success === true
      ? { status: 'passed', message: 'Analytics tracking accepts valid payload and returns success=true' }
      : {
          status: 'failed',
          message: `Expected success=true, got ${trackedEvent.errorStatus || trackedEvent.response.status}`,
          httpStatus: trackedEvent.response.status,
        }),
  });

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

  const eventsShape = await callCallableRaw('getAnalyticsEvents', fixtureContext.user.idToken, {
    limit: 1,
  });
  const firstEvent = Array.isArray(eventsShape.result?.events) ? eventsShape.result.events[0] : null;
  checks.push({
    endpoint: 'contract:getAnalyticsEvents:response-shape',
    type: 'contract',
    ...(!eventsShape.errorStatus
      && eventsShape.response.ok
      && Array.isArray(eventsShape.result?.events)
      && firstEvent
      && typeof firstEvent.id === 'string'
      && typeof firstEvent.action === 'string'
      ? { status: 'passed', message: 'Analytics events response includes typed event records (id, action)' }
      : {
          status: 'failed',
          message: `Expected events[0] with id/action, got ${eventsShape.errorStatus || eventsShape.response.status}`,
          httpStatus: eventsShape.response.status,
        }),
  });

  const summaryShape = await callCallableRaw('getAnalyticsSummary', fixtureContext.user.idToken, {
    windowDays: 7,
  });
  const summary = summaryShape.result?.summary;
  checks.push({
    endpoint: 'contract:getAnalyticsSummary:response-shape',
    type: 'contract',
    ...(!summaryShape.errorStatus
      && summaryShape.response.ok
      && summary
      && typeof summary.totalEvents === 'number'
      && typeof summary.windowDays === 'number'
      && typeof summary.byCategory === 'object'
      && typeof summary.byAction === 'object'
      && Array.isArray(summary.topActions)
      && Array.isArray(summary.trendByDay)
      ? { status: 'passed', message: 'Analytics summary response exposes expected summary fields' }
      : {
          status: 'failed',
          message: `Expected summary shape, got ${summaryShape.errorStatus || summaryShape.response.status}`,
          httpStatus: summaryShape.response.status,
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

  const unauthTestNotification = await callCallableRaw('sendTestNotification', null, {});
  checks.push({
    endpoint: 'contract:sendTestNotification:unauthenticated',
    type: 'contract',
    ...(unauthTestNotification.errorStatus === 'UNAUTHENTICATED'
      ? { status: 'passed', message: 'Unauthenticated sendTestNotification access correctly denied' }
      : {
          status: 'failed',
          message: `Expected UNAUTHENTICATED, got ${unauthTestNotification.errorStatus || unauthTestNotification.response.status}`,
          httpStatus: unauthTestNotification.response.status,
        }),
  });

  const authTestNotification = await callCallableRaw('sendTestNotification', fixtureContext.user.idToken, {});
  const testNotificationResult = authTestNotification.result;
  const hasValidTestNotificationShape =
    testNotificationResult
    && typeof testNotificationResult === 'object'
    && ['success', 'skipped', 'failure'].includes(testNotificationResult.status)
    && typeof testNotificationResult.attempted === 'number'
    && typeof testNotificationResult.sent === 'number'
    && typeof testNotificationResult.skipped === 'number'
    && typeof testNotificationResult.failed === 'number'
    && testNotificationResult.attempted === 1
    && (testNotificationResult.sent + testNotificationResult.skipped + testNotificationResult.failed) === 1;

  checks.push({
    endpoint: 'contract:sendTestNotification:semantic-status',
    type: 'contract',
    ...(!authTestNotification.errorStatus && authTestNotification.response.ok && hasValidTestNotificationShape
      ? { status: 'passed', message: 'sendTestNotification returns explicit semantic delivery status and counts' }
      : {
          status: 'failed',
          message: `Expected semantic sendTestNotification response, got ${authTestNotification.errorStatus || authTestNotification.response.status}`,
          httpStatus: authTestNotification.response.status,
        }),
  });

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function runHttpAccessContractChecks(fixtureContext) {
  const checks = [];

  const extensionWishlistsUnauth = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:unauthenticated',
    type: 'contract',
    ...(extensionWishlistsUnauth.status === 401
      ? { status: 'passed', message: 'Unauthenticated extensionGetWishlists access correctly denied' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${extensionWishlistsUnauth.status}`,
          httpStatus: extensionWishlistsUnauth.status,
        }),
  });

  const extensionWishlistsMalformedAuth = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer   ',
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:malformed-auth',
    type: 'contract',
    ...(extensionWishlistsMalformedAuth.status === 401
      ? { status: 'passed', message: 'Malformed bearer token is correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for malformed auth, got ${extensionWishlistsMalformedAuth.status}`,
          httpStatus: extensionWishlistsMalformedAuth.status,
        }),
  });

  const extensionWishlistsBasicAuth = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic Zm9vOmJhcg==',
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:basic-auth-rejected',
    type: 'contract',
    ...(extensionWishlistsBasicAuth.status === 401
      ? { status: 'passed', message: 'Basic authorization scheme is correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for Basic auth, got ${extensionWishlistsBasicAuth.status}`,
          httpStatus: extensionWishlistsBasicAuth.status,
        }),
  });

  const extensionWishlistsRawTokenAuth = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: fixtureContext.user.idToken,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:raw-token-rejected',
    type: 'contract',
    ...(extensionWishlistsRawTokenAuth.status === 401
      ? { status: 'passed', message: 'Authorization header without Bearer scheme is correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for raw token auth, got ${extensionWishlistsRawTokenAuth.status}`,
          httpStatus: extensionWishlistsRawTokenAuth.status,
        }),
  });

  const extensionWishlistsLowercaseBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:lowercase-bearer-rejected',
    type: 'contract',
    ...(extensionWishlistsLowercaseBearer.status === 401
      ? { status: 'passed', message: 'Lowercase bearer scheme is correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for lowercase bearer, got ${extensionWishlistsLowercaseBearer.status}`,
          httpStatus: extensionWishlistsLowercaseBearer.status,
        }),
  });

  const extensionWishlistsExtraSpaceBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer    ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:extra-space-bearer-accepted',
    type: 'contract',
    ...(extensionWishlistsExtraSpaceBearer.status === 200
      ? { status: 'passed', message: 'Bearer token with extra internal spaces is accepted after normalization' }
      : {
          status: 'failed',
          message: `Expected HTTP 200 for extra-space bearer, got ${extensionWishlistsExtraSpaceBearer.status}`,
          httpStatus: extensionWishlistsExtraSpaceBearer.status,
        }),
  });

  const extensionWishlistsTabBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer\t${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:tab-bearer-rejected',
    type: 'contract',
    ...(extensionWishlistsTabBearer.status === 401
      ? { status: 'passed', message: 'Bearer token with tab separator is correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for tab-separated bearer, got ${extensionWishlistsTabBearer.status}`,
          httpStatus: extensionWishlistsTabBearer.status,
        }),
  });

  const extensionAddItemInvalidBody = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({
        wishlistId: fixtureContext.ids.wishlistId,
      }),
    }
  );

  checks.push({
    endpoint: 'contract:extensionAddItem:invalid-body',
    type: 'contract',
    ...(extensionAddItemInvalidBody.status === 400
      ? { status: 'passed', message: 'extensionAddItem missing required fields correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionAddItemInvalidBody.status}`,
          httpStatus: extensionAddItemInvalidBody.status,
        }),
  });

  const extensionAddItemMalformedWishlistId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({
        wishlistId: { malformed: true },
        title: 'Malformed Wishlist Id',
      }),
    }
  );

  checks.push({
    endpoint: 'contract:extensionAddItem:malformed-wishlist-id-type',
    type: 'contract',
    ...(extensionAddItemMalformedWishlistId.status === 400
      ? { status: 'passed', message: 'extensionAddItem rejects malformed non-text wishlistId values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionAddItemMalformedWishlistId.status}`,
          httpStatus: extensionAddItemMalformedWishlistId.status,
        }),
  });

  const extensionAddItemMalformedTitle = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({
        wishlistId: fixtureContext.ids.wishlistId,
        title: { malformed: true },
      }),
    }
  );

  checks.push({
    endpoint: 'contract:extensionAddItem:malformed-title-type',
    type: 'contract',
    ...(extensionAddItemMalformedTitle.status === 400
      ? { status: 'passed', message: 'extensionAddItem rejects malformed non-text title values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionAddItemMalformedTitle.status}`,
          httpStatus: extensionAddItemMalformedTitle.status,
        }),
  });

  const extensionGetItemsMissingId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlistItems/api/extension/wishlists//items`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlistItems:missing-id',
    type: 'contract',
    ...(extensionGetItemsMissingId.status === 400
      ? { status: 'passed', message: 'extensionGetWishlistItems missing ID correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionGetItemsMissingId.status}`,
          httpStatus: extensionGetItemsMissingId.status,
        }),
  });

  const extensionGetItemsMalformedId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlistItems/api/extension/wishlists//items?wishlistId[a]=1`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlistItems:malformed-id-type',
    type: 'contract',
    ...(extensionGetItemsMalformedId.status === 400
      ? { status: 'passed', message: 'extensionGetWishlistItems rejects malformed non-text ID values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionGetItemsMalformedId.status}`,
          httpStatus: extensionGetItemsMalformedId.status,
        }),
  });

  const priceHistoryUnauth = await fetch(
    `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory?itemId=${encodeURIComponent(String(fixtureContext.ids.itemId || ''))}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  checks.push({
    endpoint: 'contract:getItemPriceHistory:unauthenticated',
    type: 'contract',
    ...(priceHistoryUnauth.status === 401
      ? { status: 'passed', message: 'Unauthenticated getItemPriceHistory access correctly denied' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${priceHistoryUnauth.status}`,
          httpStatus: priceHistoryUnauth.status,
        }),
  });

  const extensionDeleteItemMalformedId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionDeleteItem/api/extension/items/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({
        itemId: { bad: true },
      }),
    }
  );

  checks.push({
    endpoint: 'contract:extensionDeleteItem:malformed-id-type',
    type: 'contract',
    ...(extensionDeleteItemMalformedId.status === 400
      ? { status: 'passed', message: 'extensionDeleteItem rejects malformed non-text ID values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionDeleteItemMalformedId.status}`,
          httpStatus: extensionDeleteItemMalformedId.status,
        }),
  });

  const extensionDeleteItemMissingId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionDeleteItem/api/extension/items/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionDeleteItem:missing-id',
    type: 'contract',
    ...(extensionDeleteItemMissingId.status === 400
      ? { status: 'passed', message: 'extensionDeleteItem missing ID correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionDeleteItemMissingId.status}`,
          httpStatus: extensionDeleteItemMissingId.status,
        }),
  });

  const priceHistoryMalformedId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory?itemId[a]=1`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:getItemPriceHistory:malformed-id-type',
    type: 'contract',
    ...(priceHistoryMalformedId.status === 400
      ? { status: 'passed', message: 'getItemPriceHistory rejects malformed non-text itemId values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${priceHistoryMalformedId.status}`,
          httpStatus: priceHistoryMalformedId.status,
        }),
  });

  const priceHistoryMissingId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:getItemPriceHistory:missing-id',
    type: 'contract',
    ...(priceHistoryMissingId.status === 400
      ? { status: 'passed', message: 'getItemPriceHistory missing itemId correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${priceHistoryMissingId.status}`,
          httpStatus: priceHistoryMissingId.status,
        }),
  });

  const extensionAddItemTabBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer\t${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:extensionAddItem:tab-bearer-rejected',
    type: 'contract',
    ...(extensionAddItemTabBearer.status === 401
      ? { status: 'passed', message: 'extensionAddItem rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for tab-separated bearer, got ${extensionAddItemTabBearer.status}`,
          httpStatus: extensionAddItemTabBearer.status,
        }),
  });

  const extensionDeleteItemTabBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionDeleteItem/api/extension/items/${encodeURIComponent(String(fixtureContext.ids.itemId || 'missing-id'))}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer\t${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionDeleteItem:tab-bearer-rejected',
    type: 'contract',
    ...(extensionDeleteItemTabBearer.status === 401
      ? { status: 'passed', message: 'extensionDeleteItem rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for tab-separated bearer, got ${extensionDeleteItemTabBearer.status}`,
          httpStatus: extensionDeleteItemTabBearer.status,
        }),
  });

  const priceHistoryTabBearer = await fetch(
    `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory?itemId=${encodeURIComponent(String(fixtureContext.ids.itemId || ''))}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer\t${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:getItemPriceHistory:tab-bearer-rejected',
    type: 'contract',
    ...(priceHistoryTabBearer.status === 401
      ? { status: 'passed', message: 'getItemPriceHistory rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401 for tab-separated bearer, got ${priceHistoryTabBearer.status}`,
          httpStatus: priceHistoryTabBearer.status,
        }),
  });

  const extensionWishlistsWrongMethod = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:extensionGetWishlists:method-not-allowed',
    type: 'contract',
    ...(extensionWishlistsWrongMethod.status === 405
      ? { status: 'passed', message: 'extensionGetWishlists rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 405, got ${extensionWishlistsWrongMethod.status}`,
          httpStatus: extensionWishlistsWrongMethod.status,
        }),
  });

  const extensionAddItemWrongMethod = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionAddItem:method-not-allowed',
    type: 'contract',
    ...(extensionAddItemWrongMethod.status === 405
      ? { status: 'passed', message: 'extensionAddItem rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 405, got ${extensionAddItemWrongMethod.status}`,
          httpStatus: extensionAddItemWrongMethod.status,
        }),
  });

  const extensionDeleteItemWrongMethod = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionDeleteItem/api/extension/items/${encodeURIComponent(String(fixtureContext.ids.itemId || 'missing-id'))}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:extensionDeleteItem:method-not-allowed',
    type: 'contract',
    ...(extensionDeleteItemWrongMethod.status === 405
      ? { status: 'passed', message: 'extensionDeleteItem rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 405, got ${extensionDeleteItemWrongMethod.status}`,
          httpStatus: extensionDeleteItemWrongMethod.status,
        }),
  });

  const priceHistoryWrongMethod = await fetch(
    `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory?itemId=${encodeURIComponent(String(fixtureContext.ids.itemId || ''))}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:getItemPriceHistory:method-not-allowed',
    type: 'contract',
    ...(priceHistoryWrongMethod.status === 405
      ? { status: 'passed', message: 'getItemPriceHistory rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 405, got ${priceHistoryWrongMethod.status}`,
          httpStatus: priceHistoryWrongMethod.status,
        }),
  });

  const extensionShareWishlistMissingId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionShareWishlist/api/extension/wishlists//share`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:extensionShareWishlist:missing-id',
    type: 'contract',
    ...(extensionShareWishlistMissingId.status === 400
      ? { status: 'passed', message: 'extensionShareWishlist missing ID correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionShareWishlistMissingId.status}`,
          httpStatus: extensionShareWishlistMissingId.status,
        }),
  });

  const extensionShareWishlistMalformedId = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionShareWishlist/api/extension/wishlists//share?wishlistId[a]=1`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  checks.push({
    endpoint: 'contract:extensionShareWishlist:malformed-id-type',
    type: 'contract',
    ...(extensionShareWishlistMalformedId.status === 400
      ? { status: 'passed', message: 'extensionShareWishlist rejects malformed non-text ID values' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${extensionShareWishlistMalformedId.status}`,
          httpStatus: extensionShareWishlistMalformedId.status,
        }),
  });

  const extensionShareWishlistWrongMethod = await fetch(
    `http://${functionsHost}/${projectId}/${region}/extensionShareWishlist/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );

  checks.push({
    endpoint: 'contract:extensionShareWishlist:method-not-allowed',
    type: 'contract',
    ...(extensionShareWishlistWrongMethod.status === 405
      ? { status: 'passed', message: 'extensionShareWishlist rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 405, got ${extensionShareWishlistWrongMethod.status}`,
          httpStatus: extensionShareWishlistWrongMethod.status,
        }),
  });

  const preflightTargets = [
    {
      endpoint: 'contract:extensionGetWishlists:options-preflight',
      url: `http://${functionsHost}/${projectId}/${region}/extensionGetWishlists`,
    },
    {
      endpoint: 'contract:extensionAddItem:options-preflight',
      url: `http://${functionsHost}/${projectId}/${region}/extensionAddItem`,
    },
    {
      endpoint: 'contract:extensionDeleteItem:options-preflight',
      url: `http://${functionsHost}/${projectId}/${region}/extensionDeleteItem/api/extension/items/${encodeURIComponent(String(fixtureContext.ids.itemId || 'missing-id'))}`,
    },
    {
      endpoint: 'contract:getItemPriceHistory:options-preflight',
      url: `http://${functionsHost}/${projectId}/${region}/getItemPriceHistory?itemId=${encodeURIComponent(String(fixtureContext.ids.itemId || ''))}`,
    },
    {
      endpoint: 'contract:extensionShareWishlist:options-preflight',
      url: `http://${functionsHost}/${projectId}/${region}/extensionShareWishlist/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    },
  ];

  for (const target of preflightTargets) {
    const requestOrigin = 'https://example-extension.local';
    const response = await fetch(target.url, {
      method: 'OPTIONS',
      headers: {
        Origin: requestOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowMethods = response.headers.get('access-control-allow-methods') || '';
    const allowHeaders = response.headers.get('access-control-allow-headers') || '';
    const hasValidOrigin = allowOrigin === '*' || allowOrigin === requestOrigin;

    const hasExpectedCorsHeaders =
      hasValidOrigin
      && allowMethods.length > 0
      && allowHeaders.toLowerCase().includes('authorization')
      && allowHeaders.toLowerCase().includes('content-type');

    checks.push({
      endpoint: target.endpoint,
      type: 'contract',
      ...(response.status === 204 && hasExpectedCorsHeaders
        ? { status: 'passed', message: 'OPTIONS preflight returns expected CORS headers' }
        : {
            status: 'failed',
            message: `Expected HTTP 204 with CORS headers, got ${response.status} (origin=${allowOrigin || 'missing'})`,
            httpStatus: response.status,
          }),
    });
  }

  for (const check of checks) {
    recordOutcome(check.endpoint, check.type, check);
  }
}

async function runApiRouterContractChecks(fixtureContext) {
  const checks = [];

  const apiUnauth = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {},
  });
  checks.push({
    endpoint: 'contract:api-router:unauthenticated',
    type: 'contract',
    ...(apiUnauth.httpStatus === 401
      ? { status: 'passed', message: 'API router unauthenticated access correctly denied' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiUnauth.httpStatus ?? apiUnauth.message}`,
          httpStatus: apiUnauth.httpStatus,
        }),
  });

  const apiMalformedAuth = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: 'Bearer   ',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:malformed-auth',
    type: 'contract',
    ...(apiMalformedAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router malformed bearer token correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiMalformedAuth.httpStatus ?? apiMalformedAuth.message}`,
          httpStatus: apiMalformedAuth.httpStatus,
        }),
  });

  const apiBasicAuth = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: 'Basic Zm9vOmJhcg==',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:basic-auth-rejected',
    type: 'contract',
    ...(apiBasicAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router rejects Basic authorization scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiBasicAuth.httpStatus ?? apiBasicAuth.message}`,
          httpStatus: apiBasicAuth.httpStatus,
        }),
  });

  const apiRawTokenAuth = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: fixtureContext.user.idToken,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:raw-token-rejected',
    type: 'contract',
    ...(apiRawTokenAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router rejects raw token without Bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiRawTokenAuth.httpStatus ?? apiRawTokenAuth.message}`,
          httpStatus: apiRawTokenAuth.httpStatus,
        }),
  });

  const apiLowercaseBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: `bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:lowercase-bearer-rejected',
    type: 'contract',
    ...(apiLowercaseBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router rejects lowercase bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiLowercaseBearer.httpStatus ?? apiLowercaseBearer.message}`,
          httpStatus: apiLowercaseBearer.httpStatus,
        }),
  });

  const apiExtraSpaceBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: `Bearer    ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:extra-space-bearer-accepted',
    type: 'contract',
    ...(apiExtraSpaceBearer.httpStatus === 200
      ? { status: 'passed', message: 'API router accepts Bearer token with extra spaces after normalization' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiExtraSpaceBearer.httpStatus ?? apiExtraSpaceBearer.message}`,
          httpStatus: apiExtraSpaceBearer.httpStatus,
        }),
  });

  const apiTabBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: `Bearer\t${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:tab-bearer-rejected',
    type: 'contract',
    ...(apiTabBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiTabBearer.httpStatus ?? apiTabBearer.message}`,
          httpStatus: apiTabBearer.httpStatus,
        }),
  });

  const apiCreateWishlistInvalidBody = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/extension/wishlists',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      description: 'missing required name',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:create-wishlist-invalid-body',
    type: 'contract',
    ...(apiCreateWishlistInvalidBody.httpStatus === 400
      ? { status: 'passed', message: 'API router create wishlist missing name correctly rejected' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${apiCreateWishlistInvalidBody.httpStatus ?? apiCreateWishlistInvalidBody.message}`,
          httpStatus: apiCreateWishlistInvalidBody.httpStatus,
        }),
  });

  const apiBeneficiaries = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/beneficiaries',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:beneficiaries-reachable',
    type: 'contract',
    ...(apiBeneficiaries.httpStatus === 200
      ? { status: 'passed', message: 'API router beneficiaries route is reachable with authenticated Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiBeneficiaries.httpStatus ?? apiBeneficiaries.message}`,
          httpStatus: apiBeneficiaries.httpStatus,
        }),
  });

  const recommendation = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'recommendations',
    data: {
      userId: fixtureContext.user.uid,
      targetBeneficiaryId: 'contract-beneficiary',
      title: 'Contract Recommendation',
      createdAt: new Date().toISOString(),
      isViewed: false,
      isSaved: false,
      isRejected: false,
    },
  });
  const recommendationId = recommendation?.id;

  const recommendationForeign = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'recommendations',
    data: {
      userId: 'someone-else',
      targetBeneficiaryId: 'contract-beneficiary',
      title: 'Foreign Recommendation',
      createdAt: new Date().toISOString(),
      isViewed: false,
      isSaved: false,
      isRejected: false,
    },
  });
  const recommendationForeignId = recommendationForeign?.id;

  const apiRecommendations = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/recommendations',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:recommendations-reachable',
    type: 'contract',
    ...(apiRecommendations.httpStatus === 200
      ? { status: 'passed', message: 'API router recommendations route is reachable with authenticated Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiRecommendations.httpStatus ?? apiRecommendations.message}`,
          httpStatus: apiRecommendations.httpStatus,
        }),
  });

  const apiRecommendationsByBeneficiary = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/recommendations/beneficiary/contract-beneficiary',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:recommendations-by-beneficiary-reachable',
    type: 'contract',
    ...(apiRecommendationsByBeneficiary.httpStatus === 200
      ? { status: 'passed', message: 'API router beneficiary recommendations route is reachable with authenticated Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiRecommendationsByBeneficiary.httpStatus ?? apiRecommendationsByBeneficiary.message}`,
          httpStatus: apiRecommendationsByBeneficiary.httpStatus,
        }),
  });

  const apiRecommendationStatus = await invokeHttp('api', {
    method: 'PATCH',
    pathSuffix: `/api/recommendations/${encodeURIComponent(String(recommendationId || 'missing-id'))}/status`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      isViewed: true,
      isSaved: true,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:recommendation-status-update-owner',
    type: 'contract',
    ...(apiRecommendationStatus.httpStatus === 200
      ? { status: 'passed', message: 'API router recommendation status update allows owner updates' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiRecommendationStatus.httpStatus ?? apiRecommendationStatus.message}`,
          httpStatus: apiRecommendationStatus.httpStatus,
        }),
  });

  const apiRecommendationStatusForeign = await invokeHttp('api', {
    method: 'PATCH',
    pathSuffix: `/api/recommendations/${encodeURIComponent(String(recommendationForeignId || 'missing-id'))}/status`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      isViewed: true,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:recommendation-status-update-foreign-denied',
    type: 'contract',
    ...(apiRecommendationStatusForeign.httpStatus === 403
      ? { status: 'passed', message: 'API router recommendation status update denies non-owner updates' }
      : {
          status: 'failed',
          message: `Expected HTTP 403, got ${apiRecommendationStatusForeign.httpStatus ?? apiRecommendationStatusForeign.message}`,
          httpStatus: apiRecommendationStatusForeign.httpStatus,
        }),
  });

  const apiRecommendationsWrongMethod = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/recommendations',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:recommendations-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiRecommendationsWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router recommendations route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiRecommendationsWrongMethod.httpStatus ?? apiRecommendationsWrongMethod.message}`,
          httpStatus: apiRecommendationsWrongMethod.httpStatus,
        }),
  });

  const apiPrivacyDefaults = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/privacy/defaults',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-defaults-reachable',
    type: 'contract',
    ...(apiPrivacyDefaults.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy defaults route is reachable with authenticated Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyDefaults.httpStatus ?? apiPrivacyDefaults.message}`,
          httpStatus: apiPrivacyDefaults.httpStatus,
        }),
  });

  const apiPrivacyCreateInvalid = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/privacy/settings',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      visibilityLevel: 'private',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-settings-invalid-body',
    type: 'contract',
    ...(apiPrivacyCreateInvalid.httpStatus === 400
      ? { status: 'passed', message: 'API router privacy settings rejects missing entity fields' }
      : {
          status: 'failed',
          message: `Expected HTTP 400, got ${apiPrivacyCreateInvalid.httpStatus ?? apiPrivacyCreateInvalid.message}`,
          httpStatus: apiPrivacyCreateInvalid.httpStatus,
        }),
  });

  const privacyEntityId = `contract-privacy-${Date.now()}`;
  const apiPrivacyCreate = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/privacy/settings',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      entityType: 'wishlist',
      entityId: privacyEntityId,
      visibilityLevel: 'custom',
      customAccessList: ['friend-1'],
      requireApproval: true,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-settings-create',
    type: 'contract',
    ...(apiPrivacyCreate.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy settings create accepts valid payloads' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyCreate.httpStatus ?? apiPrivacyCreate.message}`,
          httpStatus: apiPrivacyCreate.httpStatus,
        }),
  });

  const apiPrivacyGet = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/privacy/settings/wishlist/${encodeURIComponent(privacyEntityId)}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-settings-get-owner',
    type: 'contract',
    ...(apiPrivacyGet.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy settings get returns owner settings' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyGet.httpStatus ?? apiPrivacyGet.message}`,
          httpStatus: apiPrivacyGet.httpStatus,
        }),
  });

  const apiPrivacyCheckAccess = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/privacy/check-access',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      entityType: 'wishlist',
      entityId: privacyEntityId,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-check-access-owner',
    type: 'contract',
    ...(apiPrivacyCheckAccess.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy access check responds for owner requests' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyCheckAccess.httpStatus ?? apiPrivacyCheckAccess.message}`,
          httpStatus: apiPrivacyCheckAccess.httpStatus,
        }),
  });

  const apiPrivacyAccessListUpdate = await invokeHttp('api', {
    method: 'PUT',
    pathSuffix: `/api/privacy/settings/wishlist/${encodeURIComponent(privacyEntityId)}/access-list`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      userIds: ['friend-1', 'friend-2'],
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-access-list-update-owner',
    type: 'contract',
    ...(apiPrivacyAccessListUpdate.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy access list update allows owner updates' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyAccessListUpdate.httpStatus ?? apiPrivacyAccessListUpdate.message}`,
          httpStatus: apiPrivacyAccessListUpdate.httpStatus,
        }),
  });

  const apiPrivacyDelete = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/privacy/settings/wishlist/${encodeURIComponent(privacyEntityId)}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-settings-delete-owner',
    type: 'contract',
    ...(apiPrivacyDelete.httpStatus === 200
      ? { status: 'passed', message: 'API router privacy settings delete allows owner deletes' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPrivacyDelete.httpStatus ?? apiPrivacyDelete.message}`,
          httpStatus: apiPrivacyDelete.httpStatus,
        }),
  });

  const apiPrivacyGetAfterDelete = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/privacy/settings/wishlist/${encodeURIComponent(privacyEntityId)}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:privacy-settings-get-after-delete',
    type: 'contract',
    ...(apiPrivacyGetAfterDelete.httpStatus === 404
      ? { status: 'passed', message: 'API router privacy settings get returns not found after delete' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiPrivacyGetAfterDelete.httpStatus ?? apiPrivacyGetAfterDelete.message}`,
          httpStatus: apiPrivacyGetAfterDelete.httpStatus,
        }),
  });

  const ownerPriceAlert = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'priceAlerts',
    data: {
      userId: fixtureContext.user.uid,
      itemId: fixtureContext.ids.itemId,
      targetPrice: 10.99,
      createdAt: new Date().toISOString(),
    },
  });

  const foreignPriceAlert = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'priceAlerts',
    data: {
      userId: 'someone-else',
      itemId: fixtureContext.ids.itemId,
      targetPrice: 9.99,
      createdAt: new Date().toISOString(),
    },
  });

  await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'priceHistory',
    data: {
      userId: fixtureContext.user.uid,
      itemId: fixtureContext.ids.itemId,
      productTitle: 'Contract Price Drop Item',
      oldPrice: 50,
      newPrice: 40,
      change: -10,
      changePercent: -20,
      store: 'Contract Store',
      timestamp: new Date().toISOString(),
    },
  });

  const apiPriceAlerts = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/price-alerts',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:price-alerts-reachable',
    type: 'contract',
    ...(apiPriceAlerts.httpStatus === 200
      ? { status: 'passed', message: 'API router price alerts route is reachable with authenticated Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPriceAlerts.httpStatus ?? apiPriceAlerts.message}`,
          httpStatus: apiPriceAlerts.httpStatus,
        }),
  });

  const apiPriceAlertDeleteOwner = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/price-alerts/${encodeURIComponent(String(ownerPriceAlert?.id || 'missing-id'))}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:price-alert-delete-owner',
    type: 'contract',
    ...(apiPriceAlertDeleteOwner.httpStatus === 200
      ? { status: 'passed', message: 'API router price alert delete allows owner deletes' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiPriceAlertDeleteOwner.httpStatus ?? apiPriceAlertDeleteOwner.message}`,
          httpStatus: apiPriceAlertDeleteOwner.httpStatus,
        }),
  });

  const apiPriceAlertDeleteForeign = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/price-alerts/${encodeURIComponent(String(foreignPriceAlert?.id || 'missing-id'))}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:price-alert-delete-foreign-denied',
    type: 'contract',
    ...(apiPriceAlertDeleteForeign.httpStatus === 403
      ? { status: 'passed', message: 'API router price alert delete denies non-owner deletes' }
      : {
          status: 'failed',
          message: `Expected HTTP 403, got ${apiPriceAlertDeleteForeign.httpStatus ?? apiPriceAlertDeleteForeign.message}`,
          httpStatus: apiPriceAlertDeleteForeign.httpStatus,
        }),
  });

  const apiPriceAlertDeleteMissing = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/price-alerts/non-existent-alert-id',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:price-alert-delete-missing',
    type: 'contract',
    ...(apiPriceAlertDeleteMissing.httpStatus === 404
      ? { status: 'passed', message: 'API router price alert delete returns not found for missing IDs' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiPriceAlertDeleteMissing.httpStatus ?? apiPriceAlertDeleteMissing.message}`,
          httpStatus: apiPriceAlertDeleteMissing.httpStatus,
        }),
  });

  const apiPriceAlertsWrongMethod = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/price-alerts',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:price-alerts-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiPriceAlertsWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router price alerts route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiPriceAlertsWrongMethod.httpStatus ?? apiPriceAlertsWrongMethod.message}`,
          httpStatus: apiPriceAlertsWrongMethod.httpStatus,
        }),
  });

  const apiPriceDropsResponse = await fetch(
    `http://${functionsHost}/${projectId}/${region}/api/api/price-drops`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );
  let apiPriceDropsJson = null;
  try {
    apiPriceDropsJson = await apiPriceDropsResponse.json();
  } catch (_) {
    apiPriceDropsJson = null;
  }

  checks.push({
    endpoint: 'contract:api-router:price-drops-shape',
    type: 'contract',
    ...(apiPriceDropsResponse.status === 200
      && Array.isArray(apiPriceDropsJson)
      && apiPriceDropsJson.length > 0
      && typeof apiPriceDropsJson[0]?.title === 'string'
      && typeof apiPriceDropsJson[0]?.percentDrop === 'number'
      ? { status: 'passed', message: 'API router price drops returns mapped response shape (title, percentDrop)' }
      : {
          status: 'failed',
          message: `Expected HTTP 200 with mapped drops array, got ${apiPriceDropsResponse.status}`,
          httpStatus: apiPriceDropsResponse.status,
        }),
  });

  const apiPriceDropsWrongMethod = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/price-drops',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:price-drops-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiPriceDropsWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router price drops route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiPriceDropsWrongMethod.httpStatus ?? apiPriceDropsWrongMethod.message}`,
          httpStatus: apiPriceDropsWrongMethod.httpStatus,
        }),
  });

  const foreignWishlist = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'wishlists',
    data: {
      userId: 'someone-else',
      name: `Foreign Wishlist ${Date.now()}`,
      isPublic: false,
      itemCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  const foreignWishlistItem = await callCallableExpectSuccess('createDocument', fixtureContext.user.idToken, {
    collection: 'wishlistItems',
    data: {
      wishlistId: foreignWishlist?.id,
      title: 'Foreign Wishlist Item',
      productUrl: 'https://example.com/foreign-item',
      createdAt: new Date().toISOString(),
    },
  });

  const apiWishlistItemsResponse = await fetch(
    `http://${functionsHost}/${projectId}/${region}/api/api/wishlist-items`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fixtureContext.user.idToken}`,
      },
    }
  );
  let apiWishlistItemsJson = null;
  try {
    apiWishlistItemsJson = await apiWishlistItemsResponse.json();
  } catch (_) {
    apiWishlistItemsJson = null;
  }

  const wishlistItemsArray = Array.isArray(apiWishlistItemsJson) ? apiWishlistItemsJson : [];
  const includesFixtureItem = wishlistItemsArray.some((entry) => entry?.id === fixtureContext.ids.itemId);
  const includesForeignItem = wishlistItemsArray.some((entry) => entry?.id === foreignWishlistItem?.id);
  const hasWishlistItemsShape = wishlistItemsArray.every((entry) => typeof entry?.id === 'string' && typeof entry?.wishlistId === 'string');

  checks.push({
    endpoint: 'contract:api-router:wishlist-items-shape-and-ownership',
    type: 'contract',
    ...(apiWishlistItemsResponse.status === 200
      && hasWishlistItemsShape
      && includesFixtureItem
      && !includesForeignItem
      ? { status: 'passed', message: 'API router wishlist-items returns shaped records and excludes foreign wishlist items' }
      : {
          status: 'failed',
          message: `Expected HTTP 200 with shaped items and ownership filtering, got ${apiWishlistItemsResponse.status}`,
          httpStatus: apiWishlistItemsResponse.status,
        }),
  });

  const apiWishlistItemsWrongMethod = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/wishlist-items',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiWishlistItemsWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router wishlist-items route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiWishlistItemsWrongMethod.httpStatus ?? apiWishlistItemsWrongMethod.message}`,
          httpStatus: apiWishlistItemsWrongMethod.httpStatus,
        }),
  });

  const apiWishlistItemsMalformedPath = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/wishlist-items/%5Bobject%20Object%5D',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-malformed-path-id',
    type: 'contract',
    ...(apiWishlistItemsMalformedPath.httpStatus === 404
      ? { status: 'passed', message: 'API router wishlist-items malformed path correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiWishlistItemsMalformedPath.httpStatus ?? apiWishlistItemsMalformedPath.message}`,
          httpStatus: apiWishlistItemsMalformedPath.httpStatus,
        }),
  });

  const apiAnalyticsPath = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/analytics/summary',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:analytics-path-not-routed',
    type: 'contract',
    ...(apiAnalyticsPath.httpStatus === 404
      ? { status: 'passed', message: 'API router does not shadow callable analytics routes (returns 404)' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiAnalyticsPath.httpStatus ?? apiAnalyticsPath.message}`,
          httpStatus: apiAnalyticsPath.httpStatus,
        }),
  });

  const apiUnknownPath = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/does-not-exist',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:unknown-path',
    type: 'contract',
    ...(apiUnknownPath.httpStatus === 404
      ? { status: 'passed', message: 'API router unknown path correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiUnknownPath.httpStatus ?? apiUnknownPath.message}`,
          httpStatus: apiUnknownPath.httpStatus,
        }),
  });

  const apiShareWishlistMissingPathId = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/extension/wishlists//share',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-wishlist-missing-path-id',
    type: 'contract',
    ...(apiShareWishlistMissingPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router share wishlist missing path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiShareWishlistMissingPathId.httpStatus ?? apiShareWishlistMissingPathId.message}`,
          httpStatus: apiShareWishlistMissingPathId.httpStatus,
        }),
  });

  const apiShareWishlistMalformedPathId = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/extension/wishlists/%5Bobject%20Object%5D/share',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-wishlist-malformed-path-id',
    type: 'contract',
    ...(apiShareWishlistMalformedPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router share wishlist malformed path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiShareWishlistMalformedPathId.httpStatus ?? apiShareWishlistMalformedPathId.message}`,
          httpStatus: apiShareWishlistMalformedPathId.httpStatus,
        }),
  });

  const apiDeleteItemMissingPathId = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/extension/items/',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-missing-path-id',
    type: 'contract',
    ...(apiDeleteItemMissingPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router delete item missing path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiDeleteItemMissingPathId.httpStatus ?? apiDeleteItemMissingPathId.message}`,
          httpStatus: apiDeleteItemMissingPathId.httpStatus,
        }),
  });

  const apiItemsWrongMethod = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(fixtureContext.ids.itemId || 'missing-id'))}`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:items-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiItemsWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router items route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiItemsWrongMethod.httpStatus ?? apiItemsWrongMethod.message}`,
          httpStatus: apiItemsWrongMethod.httpStatus,
        }),
  });

  const apiShareWrongMethod = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:share-method-not-allowed',
    type: 'contract',
    ...([404, 405].includes(apiShareWrongMethod.httpStatus || 0)
      ? { status: 'passed', message: 'API router share route rejects unsupported HTTP methods' }
      : {
          status: 'failed',
          message: `Expected HTTP 404/405, got ${apiShareWrongMethod.httpStatus ?? apiShareWrongMethod.message}`,
          httpStatus: apiShareWrongMethod.httpStatus,
        }),
  });

  const apiPreflightTargets = [
    {
      endpoint: 'contract:api-router:wishlist-items-options-preflight',
      pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
      requestMethod: 'GET',
    },
    {
      endpoint: 'contract:api-router:items-options-preflight',
      pathSuffix: `/api/extension/items/${encodeURIComponent(String(fixtureContext.ids.itemId || 'missing-id'))}`,
      requestMethod: 'DELETE',
    },
    {
      endpoint: 'contract:api-router:share-options-preflight',
      pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
      requestMethod: 'POST',
    },
  ];

  for (const target of apiPreflightTargets) {
    const requestOrigin = 'https://example-extension.local';
    const response = await fetch(
      `http://${functionsHost}/${projectId}/${region}/api${target.pathSuffix}`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: requestOrigin,
          'Access-Control-Request-Method': target.requestMethod,
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      }
    );

    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowMethods = response.headers.get('access-control-allow-methods') || '';
    const allowHeaders = response.headers.get('access-control-allow-headers') || '';
    const hasValidOrigin = allowOrigin === '*' || allowOrigin === requestOrigin;
    const hasExpectedCorsHeaders =
      hasValidOrigin
      && allowMethods.length > 0
      && allowHeaders.toLowerCase().includes('authorization')
      && allowHeaders.toLowerCase().includes('content-type');

    checks.push({
      endpoint: target.endpoint,
      type: 'contract',
      ...(response.status === 204 && hasExpectedCorsHeaders
        ? { status: 'passed', message: 'API router OPTIONS preflight returns expected CORS headers' }
        : {
            status: 'failed',
            message: `Expected HTTP 204 with CORS headers, got ${response.status} (origin=${allowOrigin || 'missing'})`,
            httpStatus: response.status,
          }),
    });
  }

  const apiWishlistItemsMissingPathId = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists//items',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-missing-path-id',
    type: 'contract',
    ...(apiWishlistItemsMissingPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router wishlist items missing path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiWishlistItemsMissingPathId.httpStatus ?? apiWishlistItemsMissingPathId.message}`,
          httpStatus: apiWishlistItemsMissingPathId.httpStatus,
        }),
  });

  const apiWishlistItemsMalformedQueryId = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists//items?wishlistId[a]=1',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-malformed-query-id-ignored',
    type: 'contract',
    ...(apiWishlistItemsMalformedQueryId.httpStatus === 404
      ? { status: 'passed', message: 'API router wishlist items ignores malformed query ID when path ID is missing' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiWishlistItemsMalformedQueryId.httpStatus ?? apiWishlistItemsMalformedQueryId.message}`,
          httpStatus: apiWishlistItemsMalformedQueryId.httpStatus,
        }),
  });

  const apiWishlistItemsMalformedPathId = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: '/api/extension/wishlists/%5Bobject%20Object%5D/items',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-malformed-path-id',
    type: 'contract',
    ...(apiWishlistItemsMalformedPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router wishlist items malformed path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiWishlistItemsMalformedPathId.httpStatus ?? apiWishlistItemsMalformedPathId.message}`,
          httpStatus: apiWishlistItemsMalformedPathId.httpStatus,
        }),
  });

  const apiDeleteItemMalformedPathId = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/extension/items/%5Bobject%20Object%5D',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-malformed-path-id',
    type: 'contract',
    ...(apiDeleteItemMalformedPathId.httpStatus === 404
      ? { status: 'passed', message: 'API router delete item malformed path ID correctly returns not found' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiDeleteItemMalformedPathId.httpStatus ?? apiDeleteItemMalformedPathId.message}`,
          httpStatus: apiDeleteItemMalformedPathId.httpStatus,
        }),
  });

  const apiDeleteItemMalformedQueryId = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/extension/items/?itemId[a]=1',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-malformed-query-id-ignored',
    type: 'contract',
    ...(apiDeleteItemMalformedQueryId.httpStatus === 404
      ? { status: 'passed', message: 'API router delete item ignores malformed query ID when path ID is missing' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiDeleteItemMalformedQueryId.httpStatus ?? apiDeleteItemMalformedQueryId.message}`,
          httpStatus: apiDeleteItemMalformedQueryId.httpStatus,
        }),
  });

  const apiDeleteItemMalformedBodyId = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: '/api/extension/items/',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      itemId: { bad: true },
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-malformed-body-id-ignored',
    type: 'contract',
    ...(apiDeleteItemMalformedBodyId.httpStatus === 404
      ? { status: 'passed', message: 'API router delete item ignores malformed body ID when path ID is missing' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiDeleteItemMalformedBodyId.httpStatus ?? apiDeleteItemMalformedBodyId.message}`,
          httpStatus: apiDeleteItemMalformedBodyId.httpStatus,
        }),
  });

  const apiWishlistItemsBasicAuth = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: 'Basic Zm9vOmJhcg==',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-basic-auth-rejected',
    type: 'contract',
    ...(apiWishlistItemsBasicAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects Basic authorization scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsBasicAuth.httpStatus ?? apiWishlistItemsBasicAuth.message}`,
          httpStatus: apiWishlistItemsBasicAuth.httpStatus,
        }),
  });

  const apiWishlistItemsRawToken = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: fixtureContext.user.idToken,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-raw-token-rejected',
    type: 'contract',
    ...(apiWishlistItemsRawToken.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects raw token without Bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsRawToken.httpStatus ?? apiWishlistItemsRawToken.message}`,
          httpStatus: apiWishlistItemsRawToken.httpStatus,
        }),
  });

  const apiWishlistItemsLowercaseBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: `bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-lowercase-bearer-rejected',
    type: 'contract',
    ...(apiWishlistItemsLowercaseBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects lowercase bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsLowercaseBearer.httpStatus ?? apiWishlistItemsLowercaseBearer.message}`,
          httpStatus: apiWishlistItemsLowercaseBearer.httpStatus,
        }),
  });

  const apiWishlistItemsExtraSpaceBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: `Bearer    ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-extra-space-bearer-accepted',
    type: 'contract',
    ...(apiWishlistItemsExtraSpaceBearer.httpStatus === 200
      ? { status: 'passed', message: 'API router wishlist items accepts Bearer token with extra spaces after normalization' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiWishlistItemsExtraSpaceBearer.httpStatus ?? apiWishlistItemsExtraSpaceBearer.message}`,
          httpStatus: apiWishlistItemsExtraSpaceBearer.httpStatus,
        }),
  });

  const apiWishlistItemsTabBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: `Bearer\t${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-tab-bearer-rejected',
    type: 'contract',
    ...(apiWishlistItemsTabBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsTabBearer.httpStatus ?? apiWishlistItemsTabBearer.message}`,
          httpStatus: apiWishlistItemsTabBearer.httpStatus,
        }),
  });

  const apiWishlistItemsBearerNoToken = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: 'Bearer',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-bearer-no-token-rejected',
    type: 'contract',
    ...(apiWishlistItemsBearerNoToken.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects Bearer header without token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsBearerNoToken.httpStatus ?? apiWishlistItemsBearerNoToken.message}`,
          httpStatus: apiWishlistItemsBearerNoToken.httpStatus,
        }),
  });

  const apiWishlistItemsWhitespaceBearer = await invokeHttp('api', {
    method: 'GET',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/items`,
    headers: {
      Authorization: 'Bearer   ',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:wishlist-items-whitespace-bearer-rejected',
    type: 'contract',
    ...(apiWishlistItemsWhitespaceBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router wishlist items rejects whitespace-only Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiWishlistItemsWhitespaceBearer.httpStatus ?? apiWishlistItemsWhitespaceBearer.message}`,
          httpStatus: apiWishlistItemsWhitespaceBearer.httpStatus,
        }),
  });

  const apiDeleteAuthTargetItemId = await createTempItem(fixtureContext, fixtureContext.ids.wishlistId);

  const apiDeleteItemBasicAuth = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: 'Basic Zm9vOmJhcg==',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-basic-auth-rejected',
    type: 'contract',
    ...(apiDeleteItemBasicAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects Basic authorization scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemBasicAuth.httpStatus ?? apiDeleteItemBasicAuth.message}`,
          httpStatus: apiDeleteItemBasicAuth.httpStatus,
        }),
  });

  const apiDeleteItemRawToken = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: fixtureContext.user.idToken,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-raw-token-rejected',
    type: 'contract',
    ...(apiDeleteItemRawToken.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects raw token without Bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemRawToken.httpStatus ?? apiDeleteItemRawToken.message}`,
          httpStatus: apiDeleteItemRawToken.httpStatus,
        }),
  });

  const apiDeleteItemLowercaseBearer = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: `bearer ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-lowercase-bearer-rejected',
    type: 'contract',
    ...(apiDeleteItemLowercaseBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects lowercase bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemLowercaseBearer.httpStatus ?? apiDeleteItemLowercaseBearer.message}`,
          httpStatus: apiDeleteItemLowercaseBearer.httpStatus,
        }),
  });

  const apiDeleteItemExtraSpaceBearer = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: `Bearer    ${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-extra-space-bearer-accepted',
    type: 'contract',
    ...(apiDeleteItemExtraSpaceBearer.httpStatus === 200
      ? { status: 'passed', message: 'API router delete item accepts Bearer token with extra spaces after normalization' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiDeleteItemExtraSpaceBearer.httpStatus ?? apiDeleteItemExtraSpaceBearer.message}`,
          httpStatus: apiDeleteItemExtraSpaceBearer.httpStatus,
        }),
  });

  const apiDeleteItemTabBearer = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: `Bearer\t${fixtureContext.user.idToken}`,
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-tab-bearer-rejected',
    type: 'contract',
    ...(apiDeleteItemTabBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemTabBearer.httpStatus ?? apiDeleteItemTabBearer.message}`,
          httpStatus: apiDeleteItemTabBearer.httpStatus,
        }),
  });

  const apiDeleteItemBearerNoToken = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: 'Bearer',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-bearer-no-token-rejected',
    type: 'contract',
    ...(apiDeleteItemBearerNoToken.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects Bearer header without token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemBearerNoToken.httpStatus ?? apiDeleteItemBearerNoToken.message}`,
          httpStatus: apiDeleteItemBearerNoToken.httpStatus,
        }),
  });

  const apiDeleteItemWhitespaceBearer = await invokeHttp('api', {
    method: 'DELETE',
    pathSuffix: `/api/extension/items/${encodeURIComponent(String(apiDeleteAuthTargetItemId || 'missing-id'))}`,
    headers: {
      Authorization: 'Bearer   ',
    },
  });
  checks.push({
    endpoint: 'contract:api-router:delete-item-whitespace-bearer-rejected',
    type: 'contract',
    ...(apiDeleteItemWhitespaceBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router delete item rejects whitespace-only Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiDeleteItemWhitespaceBearer.httpStatus ?? apiDeleteItemWhitespaceBearer.message}`,
          httpStatus: apiDeleteItemWhitespaceBearer.httpStatus,
        }),
  });

  const apiShareBasicAuth = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: 'Basic Zm9vOmJhcg==',
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-basic-auth-rejected',
    type: 'contract',
    ...(apiShareBasicAuth.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects Basic authorization scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareBasicAuth.httpStatus ?? apiShareBasicAuth.message}`,
          httpStatus: apiShareBasicAuth.httpStatus,
        }),
  });

  const apiShareRawToken = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: fixtureContext.user.idToken,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-raw-token-rejected',
    type: 'contract',
    ...(apiShareRawToken.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects raw token without Bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareRawToken.httpStatus ?? apiShareRawToken.message}`,
          httpStatus: apiShareRawToken.httpStatus,
        }),
  });

  const apiShareLowercaseBearer = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: `bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-lowercase-bearer-rejected',
    type: 'contract',
    ...(apiShareLowercaseBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects lowercase bearer scheme' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareLowercaseBearer.httpStatus ?? apiShareLowercaseBearer.message}`,
          httpStatus: apiShareLowercaseBearer.httpStatus,
        }),
  });

  const apiShareExtraSpaceBearer = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: `Bearer    ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-extra-space-bearer-accepted',
    type: 'contract',
    ...(apiShareExtraSpaceBearer.httpStatus === 200
      ? { status: 'passed', message: 'API router share route accepts Bearer token with extra spaces after normalization' }
      : {
          status: 'failed',
          message: `Expected HTTP 200, got ${apiShareExtraSpaceBearer.httpStatus ?? apiShareExtraSpaceBearer.message}`,
          httpStatus: apiShareExtraSpaceBearer.httpStatus,
        }),
  });

  const apiShareTabBearer = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: `Bearer\t${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-tab-bearer-rejected',
    type: 'contract',
    ...(apiShareTabBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects Bearer token with tab separator' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareTabBearer.httpStatus ?? apiShareTabBearer.message}`,
          httpStatus: apiShareTabBearer.httpStatus,
        }),
  });

  const apiShareMalformedQueryId = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/extension/wishlists//share?wishlistId[a]=1',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-malformed-query-id-ignored',
    type: 'contract',
    ...(apiShareMalformedQueryId.httpStatus === 404
      ? { status: 'passed', message: 'API router share route ignores malformed query ID when path ID is missing' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiShareMalformedQueryId.httpStatus ?? apiShareMalformedQueryId.message}`,
          httpStatus: apiShareMalformedQueryId.httpStatus,
        }),
  });

  const apiShareMalformedBodyId = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: '/api/extension/wishlists//share',
    headers: {
      Authorization: `Bearer ${fixtureContext.user.idToken}`,
    },
    body: {
      wishlistId: { bad: true },
    },
  });
  checks.push({
    endpoint: 'contract:api-router:share-malformed-body-id-ignored',
    type: 'contract',
    ...(apiShareMalformedBodyId.httpStatus === 404
      ? { status: 'passed', message: 'API router share route ignores malformed body ID when path ID is missing' }
      : {
          status: 'failed',
          message: `Expected HTTP 404, got ${apiShareMalformedBodyId.httpStatus ?? apiShareMalformedBodyId.message}`,
          httpStatus: apiShareMalformedBodyId.httpStatus,
        }),
  });

  const apiShareBearerNoToken = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: 'Bearer',
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-bearer-no-token-rejected',
    type: 'contract',
    ...(apiShareBearerNoToken.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects Bearer header without token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareBearerNoToken.httpStatus ?? apiShareBearerNoToken.message}`,
          httpStatus: apiShareBearerNoToken.httpStatus,
        }),
  });

  const apiShareWhitespaceBearer = await invokeHttp('api', {
    method: 'POST',
    pathSuffix: `/api/extension/wishlists/${encodeURIComponent(String(fixtureContext.ids.wishlistId || 'missing-id'))}/share`,
    headers: {
      Authorization: 'Bearer   ',
    },
    body: {},
  });
  checks.push({
    endpoint: 'contract:api-router:share-whitespace-bearer-rejected',
    type: 'contract',
    ...(apiShareWhitespaceBearer.httpStatus === 401
      ? { status: 'passed', message: 'API router share route rejects whitespace-only Bearer token' }
      : {
          status: 'failed',
          message: `Expected HTTP 401, got ${apiShareWhitespaceBearer.httpStatus ?? apiShareWhitespaceBearer.message}`,
          httpStatus: apiShareWhitespaceBearer.httpStatus,
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
    case 'reserveWishlistItem':
      return { itemId: ctx.ids.itemId };
    case 'purchaseWishlistItem':
      return { itemId: ctx.ids.itemId };
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
      await callCallableExpectSuccess('saveFCMToken', ctx.user.idToken, {
        token: `fcm_contract_token_${Date.now()}`,
        platform: 'web',
      });
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
      return {
        provider: 'apple',
        subscriptionUrl: `webcal://example.com/${uid}/calendar-${Date.now()}.ics`,
        displayName: 'Smoke Apple Calendar',
      };
    case 'updateCalendarConnectionSettings': {
      const connection = await callCallableExpectSuccess('connectCalendar', ctx.user.idToken, {
        provider: 'apple',
        subscriptionUrl: `webcal://example.com/${uid}/calendar-settings-${Date.now()}.ics`,
        displayName: 'Smoke Calendar Settings',
      });
      return { connectionId: connection?.id, settings: { syncEvents: true, syncDirection: 'import' } };
    }
    case 'disconnectCalendar': {
      const connection = await callCallableExpectSuccess('connectCalendar', ctx.user.idToken, {
        provider: 'apple',
        subscriptionUrl: `webcal://example.com/${uid}/calendar-disconnect-${Date.now()}.ics`,
        displayName: 'Smoke Calendar Disconnect',
      });
      return { connectionId: connection?.id };
    }
    case 'syncCalendarConnection': {
      const connection = await callCallableExpectSuccess('connectCalendar', ctx.user.idToken, {
        provider: 'apple',
        subscriptionUrl: `webcal://example.com/${uid}/calendar-sync-${Date.now()}.ics`,
        displayName: 'Smoke Calendar Sync',
      });
      return { connectionId: connection?.id };
    }

    case 'importContacts':
      return {
        provider: 'apple',
        vcard: [
          'BEGIN:VCARD',
          'VERSION:3.0',
          'FN:Smoke Import Contact',
          'UID:smoke-import-contact',
          'EMAIL:smoke-import@example.com',
          'END:VCARD',
        ].join('\n'),
      };
    case 'hideContact': {
      const tempContact = await callCallableExpectSuccess('createDocument', ctx.user.idToken, {
        collection: 'beneficiaries',
        data: {
          ownerId: uid,
          name: `Smoke Hide Contact ${Date.now()}`,
          relationship: 'contact',
          isHidden: false,
        },
      });
      return { contactId: tempContact?.id };
    }
    case 'deleteContact': {
      const tempContact = await callCallableExpectSuccess('createDocument', ctx.user.idToken, {
        collection: 'beneficiaries',
        data: {
          ownerId: uid,
          name: `Smoke Delete Contact ${Date.now()}`,
          relationship: 'contact',
          isHidden: false,
        },
      });
      return { contactId: tempContact?.id };
    }

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
  const eventTriggerPattern = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*on(DocumentCreated|DocumentUpdated|DocumentDeleted|DocumentWritten)\\b`);

  if (onCallPattern.test(source)) return 'onCall';
  if (onRequestPattern.test(source)) return 'onRequest';
  if (eventTriggerPattern.test(source)) return 'eventTrigger';
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
        if (treatExpectedDependencyGapsAsPass) {
          const rule = CALLABLE_DEPENDENCY_GAP_RULES[functionName];
          if (matchesDependencyGapRule(rule, errorStatus, errorMessage)) {
            return {
              status: 'passed',
              durationMs: Date.now() - started,
              httpStatus: response.status,
              message: `Expected dependency gap treated as pass (${errorStatus})`,
            };
          }
        }

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
      if (treatExpectedDependencyGapsAsPass) {
        const responseText = await response.text();
        const rule = HTTP_DEPENDENCY_GAP_RULES[functionName];
        if (matchesDependencyGapRule(rule, response.status, responseText)) {
          return {
            status: 'passed',
            durationMs: Date.now() - started,
            httpStatus: response.status,
            message: `Expected dependency gap treated as pass (HTTP ${response.status})`,
          };
        }
      }

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
  const eventTriggerEntries = endpointEntries.filter(entry => entry.type === 'eventTrigger');

  const testUser = await seedAuthUser();
  console.log(`✅ Seeded and authenticated smoke user ${testUser.email}`);

  const fixtureContext = await buildFixtureContext(testUser);
  console.log('✅ Prepared fixture data for contract payload validation');

  await runAnalyticsAccessContractChecks(fixtureContext);
  await runAnalyticsNormalizationContractChecks(fixtureContext);
  await runNotificationAccessContractChecks(fixtureContext);
  await runFcmAccessContractChecks(fixtureContext);
  await runHttpAccessContractChecks(fixtureContext);
  await runApiRouterContractChecks(fixtureContext);

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

  for (const entry of eventTriggerEntries) {
    recordOutcome(entry.name, entry.type, {
      status: 'passed',
      message: 'Event trigger export detected (non-invocable in direct smoke runner)',
    });
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
