import { getFirestore } from "firebase-admin/firestore";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import type { AdminRole } from "@wishlist-wizard/shared";

ensureFirebaseAdmin();
const db = getFirestore();

export const requireAuthenticatedUser = (request: CallableRequest): string => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  return request.auth.uid;
};

export const isAdminRequest = async (request: CallableRequest): Promise<boolean> => {
  const token = request.auth?.token as Record<string, unknown> | undefined;
  if (token?.admin === true || token?.role === "admin") {
    return true;
  }

  const uid = request.auth?.uid;
  if (!uid) {
    return false;
  }

  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : null;
  return Boolean(userData?.isAdmin || userData?.role === "admin");
};

export const requireAdminUser = async (
  request: CallableRequest,
  message = "Admin role required"
): Promise<string> => {
  const uid = requireAuthenticatedUser(request);
  const isAdmin = await isAdminRequest(request);

  if (!isAdmin) {
    throw new HttpsError("permission-denied", message);
  }

  return uid;
};

// ─────────────────────────────────────────────────────────────────────────────
// Super-admin RBAC helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the admin role for a UID, or null if the user is not an admin */
export async function getAdminRole(uid: string): Promise<AdminRole | null> {
  const doc = await db.collection("adminUsers").doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (!data.isActive) return null;
  return (data.role as AdminRole) ?? null;
}

/** Throws permission-denied if the calling user is not a super_admin */
export async function requireSuperAdmin(
  request: CallableRequest,
  message = "Super-admin role required"
): Promise<string> {
  const uid = requireAuthenticatedUser(request);
  const role = await getAdminRole(uid);
  if (role !== "super_admin") {
    throw new HttpsError("permission-denied", message);
  }
  return uid;
}

/**
 * Throws permission-denied if the calling user does not hold the specified
 * admin role. Accepts a list of allowed roles; super_admin always passes.
 */
export async function requireAdminRole(
  request: CallableRequest,
  allowedRoles: AdminRole[],
  message = "Insufficient admin privileges"
): Promise<{ uid: string; role: AdminRole }> {
  const uid = requireAuthenticatedUser(request);
  const role = await getAdminRole(uid);

  if (!role) throw new HttpsError("permission-denied", message);
  // super_admin is always allowed
  if (role === "super_admin" || allowedRoles.includes(role)) return { uid, role };

  throw new HttpsError("permission-denied", message);
}

