import { Request } from 'express';

// Firebase-first authentication types
// Note: Session-based authentication has been replaced with Firebase authentication
// The req.userId property is now set by Firebase middleware instead of sessions

export interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}