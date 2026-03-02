import { getFirestore } from "firebase-admin/firestore";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { ensureFirebaseAdmin } from "../firebase-admin.js";

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
