import { getAppCheck } from 'firebase-admin/app-check';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { Request } from 'express';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';

ensureFirebaseAdmin();

/**
 * Verify App Check token from callable function request
 * Use as a guard to protect API endpoints from unauthorized access
 * 
 * For production security:
 * - Web: Requires reCAPTCHA v3 (configured in Firebase Console)
 * - Mobile: Requires SafetyNet (Android) or DeviceCheck (iOS)
 */
export async function verifyAppCheckToken(request: CallableRequest): Promise<boolean> {
  try {
    const appCheckToken = request.rawRequest?.headers['x-firebase-appcheck'] as string;
    
    if (!appCheckToken) {
      logger.warn('Missing App Check token in request');
      return false;
    }

    const appCheck = getAppCheck();
    const decodedToken = await appCheck.verifyToken(appCheckToken);
    
    if (!decodedToken) {
      logger.warn('Invalid or expired App Check token');
      return false;
    }

    logger.info('App Check token verified', { appId: decodedToken.appId });
    return true;
  } catch (error) {
    logger.error('App Check verification error:', error);
    return false;
  }
}

/**
 * Verify App Check token from HTTP request
 * Use for HTTP endpoints and webhooks
 */
export async function verifyAppCheckTokenHTTP(req: Request): Promise<boolean> {
  try {
    const appCheckToken = req.headers['x-firebase-appcheck'] as string;
    
    if (!appCheckToken) {
      logger.warn('Missing App Check token in HTTP request');
      return false;
    }

    const appCheck = getAppCheck();
    const decodedToken = await appCheck.verifyToken(appCheckToken);
    
    if (!decodedToken) {
      logger.warn('Invalid or expired App Check token in HTTP request');
      return false;
    }

    logger.info('HTTP App Check token verified', { appId: decodedToken.appId });
    return true;
  } catch (error) {
    logger.error('HTTP App Check verification error:', error);
    return false;
  }
}

/**
 * Middleware for callable functions - enforces App Check verification
 * Usage: if (!(await requireAppCheck(request))) { throw new HttpsError(...) }
 */
export async function requireAppCheck(request: CallableRequest, errorMessage?: string): Promise<boolean> {
  const isValid = await verifyAppCheckToken(request);
  
  if (!isValid) {
    // In development/emulator, log warning but don't fail
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      logger.warn('App Check verification skipped in emulator environment');
      return true; // Allow in emulator for testing
    }
    
    logger.error('App Check verification failed for request');
    throw new HttpsError(
      'permission-denied',
      errorMessage || 'Request failed App Check verification. Please ensure you are using the official app.'
    );
  }
  
  return true;
}

/**
 * Middleware for HTTP functions - enforces App Check verification
 * Usage in HTTP functions:
 * if (!await requireAppCheckHTTP(req, res)) return;
 */
export async function requireAppCheckHTTP(req: Request, res?: any, errorMessage?: string): Promise<boolean> {
  const isValid = await verifyAppCheckTokenHTTP(req);
  
  if (!isValid) {
    // In development/emulator, log warning but don't fail
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      logger.warn('App Check verification skipped in HTTP emulator environment');
      return true; // Allow in emulator for testing
    }
    
    logger.error('App Check verification failed for HTTP request');
    if (res) {
      res.status(403).json({
        error: errorMessage || 'Request failed App Check verification. Please ensure you are using the official app.'
      });
    }
    return false;
  }
  
  return true;
}
