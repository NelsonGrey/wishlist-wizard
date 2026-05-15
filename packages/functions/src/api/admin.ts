/**
 * Super-Administrator Cloud Functions
 *
 * All functions here require the caller to be listed in /adminUsers/{uid}
 * with isActive: true, unless otherwise noted (bootstrapSuperAdmin is protected
 * by a deploy-time secret instead).
 *
 * Functions:
 *   bootstrapSuperAdmin      — One-time setup to create the first super-admin
 *   grantAdminRole           — Grant another user an admin role (super_admin only)
 *   revokeAdminRole          — Remove admin access (super_admin only)
 *   adminGetUsers            — Paginated user list with subscription context
 *   adminGetUser             — Single user detail with full subscription data
 *   adminSuspendUser         — Suspend a user account
 *   adminUnsuspendUser       — Reinstate a suspended user
 *   adminGetSubscriptions    — Paginated subscription list (filter by tier/status)
 *   adminModifySubscription  — Override a user's tier (comps, disputes)
 *   adminGetSupportTickets   — Paginated ticket list
 *   adminRespondToTicket     — Add a reply and change ticket status
 *   adminGetAuditLog         — Filtered audit log viewer
 *   createSupportTicket      — User-facing: open a support ticket
 */

import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { requireSuperAdmin, requireAdminRole } from '../utils/auth-guards.js';
import { getUserTier, getUserUsage } from '../utils/subscription-guard.js';
import { TIER_LIMITS, AdminRole } from '@wishlist-wizard/shared';

ensureFirebaseAdmin();
const db = getFirestore();
const auth = getAuth();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: write to immutable audit log
// ─────────────────────────────────────────────────────────────────────────────

async function auditLog(entry: {
  action: string;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  reason?: string;
}): Promise<void> {
  try {
    await db.collection('auditLog').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { entry, err });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// bootstrapSuperAdmin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ONE-TIME function. Creates the first super_admin record in /adminUsers.
 * Protected by a deploy-time secret (BOOTSTRAP_ADMIN_SECRET env var).
 * After the first super_admin exists, calling this again returns an error.
 *
 * Request: { uid, email, displayName, secret }
 */
export const bootstrapSuperAdmin = onCall(async (request: CallableRequest) => {
  const { uid, email, displayName, secret } = request.data ?? {};

  const configuredSecret = process.env.BOOTSTRAP_ADMIN_SECRET;
  if (!configuredSecret) {
    throw new HttpsError('unimplemented', 'Bootstrap secret not configured');
  }
  if (secret !== configuredSecret) {
    throw new HttpsError('permission-denied', 'Invalid bootstrap secret');
  }
  if (!uid || !email) {
    throw new HttpsError('invalid-argument', 'uid and email are required');
  }

  // Check if already bootstrapped
  const systemDoc = await db.collection('system').doc('bootstrap').get();
  if (systemDoc.exists && systemDoc.data()?.bootstrapped === true) {
    throw new HttpsError('already-exists', 'Super-admin already bootstrapped');
  }

  // Verify the Firebase user exists
  let userRecord: any;
  try {
    userRecord = await auth.getUser(uid);
  } catch {
    throw new HttpsError('not-found', `Firebase user ${uid} not found`);
  }

  const now = FieldValue.serverTimestamp();

  await Promise.all([
    // Create admin record
    db.collection('adminUsers').doc(uid).set({
      uid,
      email: userRecord.email ?? email,
      displayName: userRecord.displayName ?? displayName ?? 'Super Admin',
      role: 'super_admin',
      permissions: [
        'users.read', 'users.suspend', 'users.delete', 'users.impersonate',
        'subscriptions.read', 'subscriptions.modify', 'subscriptions.refund',
        'affiliate.read', 'affiliate.adjust',
        'support.read', 'support.respond',
        'system.config',
        'audit.read',
      ],
      isActive: true,
      mfaRequired: true,
      mfaVerified: false,
      grantedBy: 'bootstrap',
      grantedAt: now,
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
    // Set custom claim
    auth.setCustomUserClaims(uid, { role: 'super_admin', admin: true }),
    // Update user document
    db.collection('users').doc(uid).set({ role: 'super_admin', updatedAt: now }, { merge: true }),
    // Mark bootstrapped
    db.collection('system').doc('bootstrap').set({
      bootstrapped: true,
      bootstrappedAt: now,
      bootstrappedBy: uid,
    }),
  ]);

  logger.info('Super-admin bootstrapped', { uid, email });
  return { success: true, message: `Super-admin created for ${email}` };
});

// ─────────────────────────────────────────────────────────────────────────────
// grantAdminRole
// ─────────────────────────────────────────────────────────────────────────────

export const grantAdminRole = onCall(async (request: CallableRequest) => {
  const grantorUid = await requireSuperAdmin(request, 'Only super_admin can grant admin roles');
  const { targetUid, role, reason } = request.data ?? {};

  if (!targetUid || !role) {
    throw new HttpsError('invalid-argument', 'targetUid and role are required');
  }

  const validRoles: AdminRole[] = ['support_agent', 'billing_admin', 'super_admin', 'read_only'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role: ${role}`);
  }

  let targetUser: any;
  try {
    targetUser = await auth.getUser(targetUid);
  } catch {
    throw new HttpsError('not-found', `User ${targetUid} not found`);
  }

  const permissions = roleDefaultPermissions(role);
  const now = FieldValue.serverTimestamp();

  await Promise.all([
    db.collection('adminUsers').doc(targetUid).set({
      uid: targetUid,
      email: targetUser.email ?? '',
      displayName: targetUser.displayName ?? '',
      role,
      permissions,
      isActive: true,
      mfaRequired: true,
      mfaVerified: false,
      grantedBy: grantorUid,
      grantedAt: now,
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true }),
    auth.setCustomUserClaims(targetUid, { role, admin: true }),
    db.collection('users').doc(targetUid).set({ role, updatedAt: now }, { merge: true }),
    auditLog({
      action: 'admin.granted',
      actorUid: grantorUid,
      actorRole: 'super_admin',
      resourceType: 'admin',
      resourceId: targetUid,
      newState: { role, permissions },
      reason,
    }),
  ]);

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// revokeAdminRole
// ─────────────────────────────────────────────────────────────────────────────

export const revokeAdminRole = onCall(async (request: CallableRequest) => {
  const revokerUid = await requireSuperAdmin(request);
  const { targetUid, reason } = request.data ?? {};
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required');

  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.collection('adminUsers').doc(targetUid).set({ isActive: false, updatedAt: now }, { merge: true }),
    auth.setCustomUserClaims(targetUid, { role: 'user', admin: false }),
    db.collection('users').doc(targetUid).set({ role: 'user', updatedAt: now }, { merge: true }),
    auditLog({
      action: 'admin.revoked',
      actorUid: revokerUid,
      actorRole: 'super_admin',
      resourceType: 'admin',
      resourceId: targetUid,
      reason,
    }),
  ]);

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// adminGetUsers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated user list with subscription context.
 * Request: { pageSize?, startAfter?, filter?: { tier?, suspended?, searchEmail? } }
 */
export const adminGetUsers = onCall(async (request: CallableRequest) => {
  await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { pageSize = 25, startAfter, filter = {} } = request.data ?? {};

  let query = db.collection('users').orderBy('createdAt', 'desc').limit(Math.min(pageSize, 100));

  if (filter.tier) query = query.where('subscriptionTier', '==', filter.tier) as any;
  if (filter.suspended === true) query = query.where('isSuspended', '==', true) as any;
  if (startAfter) {
    const cursor = await db.collection('users').doc(startAfter).get();
    if (cursor.exists) query = query.startAfter(cursor) as any;
  }

  const snap = await query.get();
  const users = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      subscriptionTier: data.subscriptionTier ?? 'free',
      subscriptionStatus: data.subscriptionStatus ?? 'active',
      isSuspended: data.isSuspended ?? false,
      createdAt: data.createdAt,
      lastSignInAt: data.lastSignInAt,
    };
  });

  return { users, nextStartAfter: snap.docs.at(-1)?.id ?? null };
});

// ─────────────────────────────────────────────────────────────────────────────
// adminGetUser
// ─────────────────────────────────────────────────────────────────────────────

export const adminGetUser = onCall(async (request: CallableRequest) => {
  await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { targetUid } = request.data ?? {};
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required');

  const [userDoc, subDoc, usage] = await Promise.all([
    db.collection('users').doc(targetUid).get(),
    db.collection('subscriptions').doc(targetUid).get(),
    getUserUsage(targetUid),
  ]);

  if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

  const user = userDoc.data()!;
  const sub = subDoc.exists ? subDoc.data() : null;

  return {
    uid: targetUid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: user.createdAt,
    isSuspended: user.isSuspended ?? false,
    suspendedAt: user.suspendedAt ?? null,
    suspendedReason: user.suspendedReason ?? null,
    subscription: sub ? {
      tier: sub.tier,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    } : null,
    usage,
    limits: TIER_LIMITS[(sub?.tier as string ?? 'free') as import('@wishlist-wizard/shared').SubscriptionTier] ?? TIER_LIMITS.free,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// adminSuspendUser / adminUnsuspendUser
// ─────────────────────────────────────────────────────────────────────────────

export const adminSuspendUser = onCall(async (request: CallableRequest) => {
  const { uid: actorUid, role } = await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { targetUid, reason } = request.data ?? {};
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required');
  if (!reason) throw new HttpsError('invalid-argument', 'reason is required for suspension');

  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.collection('users').doc(targetUid).set(
      { isSuspended: true, suspendedAt: now, suspendedReason: reason, suspendedBy: actorUid, updatedAt: now },
      { merge: true },
    ),
    auth.revokeRefreshTokens(targetUid),
    auditLog({
      action: 'user.suspended',
      actorUid,
      actorRole: role,
      resourceType: 'user',
      resourceId: targetUid,
      newState: { isSuspended: true, reason },
      reason,
    }),
  ]);

  return { success: true };
});

export const adminUnsuspendUser = onCall(async (request: CallableRequest) => {
  const { uid: actorUid, role } = await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { targetUid, reason } = request.data ?? {};
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required');

  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.collection('users').doc(targetUid).set(
      { isSuspended: false, suspendedAt: null, suspendedReason: null, suspendedBy: null, updatedAt: now },
      { merge: true },
    ),
    auditLog({
      action: 'user.unsuspended',
      actorUid,
      actorRole: role,
      resourceType: 'user',
      resourceId: targetUid,
      reason,
    }),
  ]);

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// adminModifySubscription — manual tier override
// ─────────────────────────────────────────────────────────────────────────────

export const adminModifySubscription = onCall(async (request: CallableRequest) => {
  const { uid: actorUid, role } = await requireAdminRole(request, ['billing_admin']);
  const { targetUid, newTier, reason } = request.data ?? {};
  if (!targetUid || !newTier) throw new HttpsError('invalid-argument', 'targetUid and newTier are required');
  if (!reason) throw new HttpsError('invalid-argument', 'reason is required for subscription modification');

  const subDoc = await db.collection('subscriptions').doc(targetUid).get();
  const previousTier = subDoc.exists ? subDoc.data()?.tier : 'free';
  const now = FieldValue.serverTimestamp();

  const tierOrder = ['free', 'starter', 'plus', 'creator', 'business', 'enterprise'];
  const prevIdx = tierOrder.indexOf(previousTier ?? 'free');
  const newIdx = tierOrder.indexOf(newTier);

  await Promise.all([
    db.collection('subscriptions').doc(targetUid).set(
      { tier: newTier, updatedAt: now, updatedBy: 'admin' },
      { merge: true },
    ),
    db.collection('users').doc(targetUid).set(
      { subscriptionTier: newTier, updatedAt: now },
      { merge: true },
    ),
    auditLog({
      action: newIdx >= prevIdx ? 'subscription.upgraded' : 'subscription.downgraded',
      actorUid,
      actorRole: role,
      resourceType: 'subscription',
      resourceId: targetUid,
      previousState: { tier: previousTier },
      newState: { tier: newTier },
      reason,
    }),
  ]);

  return { success: true, previousTier, newTier };
});

// ─────────────────────────────────────────────────────────────────────────────
// Support Tickets
// ─────────────────────────────────────────────────────────────────────────────

/** User-facing: open a support ticket */
export const createSupportTicket = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  const uid = request.auth.uid;
  const { category, subject, description } = request.data ?? {};

  if (!category || !subject || !description) {
    throw new HttpsError('invalid-argument', 'category, subject, and description are required');
  }

  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.exists ? userDoc.data() : {};
  const tier = await getUserTier(uid);

  const now = FieldValue.serverTimestamp();
  const ref = await db.collection('supportTickets').add({
    userId: uid,
    userEmail: user?.email ?? '',
    category,
    subject: subject.substring(0, 200),
    description: description.substring(0, 5000),
    priority: 'normal',
    status: 'open',
    messages: [{
      id: `msg_${Date.now()}`,
      authorUid: uid,
      authorRole: 'user',
      message: description.substring(0, 5000),
      createdAt: new Date(),
    }],
    context: {
      subscriptionTier: tier,
      accountCreatedAt: user?.createdAt ?? null,
      stripeCustomerId: user?.stripeCustomerId ?? null,
    },
    createdAt: now,
    updatedAt: now,
  });

  return { ticketId: ref.id };
});

/** Admin: get paginated ticket list */
export const adminGetSupportTickets = onCall(async (request: CallableRequest) => {
  await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { pageSize = 25, startAfter, filter = {} } = request.data ?? {};

  let query = db.collection('supportTickets').orderBy('createdAt', 'desc').limit(Math.min(pageSize, 100));
  if (filter.status) query = query.where('status', '==', filter.status) as any;
  if (filter.assignedTo) query = query.where('assignedTo', '==', filter.assignedTo) as any;
  if (startAfter) {
    const cursor = await db.collection('supportTickets').doc(startAfter).get();
    if (cursor.exists) query = query.startAfter(cursor) as any;
  }

  const snap = await query.get();
  const tickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { tickets, nextStartAfter: snap.docs.at(-1)?.id ?? null };
});

/** Admin: respond to a ticket */
export const adminRespondToTicket = onCall(async (request: CallableRequest) => {
  const { uid: actorUid } = await requireAdminRole(request, ['support_agent', 'billing_admin']);
  const { ticketId, message, newStatus } = request.data ?? {};
  if (!ticketId || !message) throw new HttpsError('invalid-argument', 'ticketId and message are required');

  const ticketRef = db.collection('supportTickets').doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists) throw new HttpsError('not-found', 'Ticket not found');

  const newMessage = {
    id: `msg_${Date.now()}`,
    authorUid: actorUid,
    authorRole: 'admin',
    message: message.substring(0, 5000),
    createdAt: new Date(),
  };

  const update: Record<string, any> = {
    messages: FieldValue.arrayUnion(newMessage),
    updatedAt: FieldValue.serverTimestamp(),
    assignedTo: actorUid,
  };
  if (newStatus) update.status = newStatus;

  await ticketRef.update(update);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// adminGetAuditLog
// ─────────────────────────────────────────────────────────────────────────────

export const adminGetAuditLog = onCall(async (request: CallableRequest) => {
  await requireAdminRole(request, ['billing_admin']);
  const { pageSize = 50, startAfter, filter = {} } = request.data ?? {};

  let query = db.collection('auditLog').orderBy('timestamp', 'desc').limit(Math.min(pageSize, 200));
  if (filter.resourceType) query = query.where('resourceType', '==', filter.resourceType) as any;
  if (filter.resourceId) query = query.where('resourceId', '==', filter.resourceId) as any;
  if (filter.actorUid) query = query.where('actorUid', '==', filter.actorUid) as any;
  if (startAfter) {
    const cursor = await db.collection('auditLog').doc(startAfter).get();
    if (cursor.exists) query = query.startAfter(cursor) as any;
  }

  const snap = await query.get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { entries, nextStartAfter: snap.docs.at(-1)?.id ?? null };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function roleDefaultPermissions(role: AdminRole): string[] {
  const map: Partial<Record<AdminRole, string[]>> = {
    read_only: ['users.read', 'subscriptions.read', 'support.read', 'audit.read'],
    support_agent: ['users.read', 'users.suspend', 'subscriptions.read', 'support.read', 'support.respond', 'audit.read'],
    billing_admin: ['users.read', 'users.suspend', 'subscriptions.read', 'subscriptions.modify', 'subscriptions.refund', 'affiliate.read', 'affiliate.adjust', 'support.read', 'support.respond', 'audit.read'],
    super_admin: ['users.read', 'users.suspend', 'users.delete', 'users.impersonate', 'subscriptions.read', 'subscriptions.modify', 'subscriptions.refund', 'affiliate.read', 'affiliate.adjust', 'support.read', 'support.respond', 'system.config', 'audit.read'],
  };
  return map[role] ?? map.read_only ?? [];
}
