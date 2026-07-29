type AuthErrorContext = 'login' | 'signup' | 'reset-password';

const FIREBASE_NOT_CONFIGURED_MESSAGE = 'Firebase is not configured for this environment. Ask your admin to set VITE_FIREBASE_* env vars.';

const CONTEXT_DEFAULT_MESSAGES: Record<AuthErrorContext, string> = {
  login: 'Failed to sign in. Please try again.',
  signup: 'Failed to create account. Please try again.',
  'reset-password': 'Failed to send password reset email. Please try again.',
};

const OAUTH_CODE_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Contact support if this persists.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
};

const CONTEXT_CODE_MESSAGES: Record<AuthErrorContext, Record<string, string>> = {
  login: {
    'app/firebase-not-configured': FIREBASE_NOT_CONFIGURED_MESSAGE,
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    ...OAUTH_CODE_MESSAGES,
  },
  signup: {
    'app/firebase-not-configured': FIREBASE_NOT_CONFIGURED_MESSAGE,
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/password-does-not-meet-requirements': 'Password does not meet the required strength policy.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    ...OAUTH_CODE_MESSAGES,
  },
  'reset-password': {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many requests. Please try again later.',
  },
};

export function isAccountExistsWithDifferentCredentialError(error: unknown): boolean {
  const candidate = (typeof error === 'object' && error !== null) ? (error as { code?: string }) : undefined;
  return candidate?.code === 'auth/account-exists-with-different-credential';
}

export function getFirebaseAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  const candidate = (typeof error === 'object' && error !== null) ? (error as { code?: string }) : undefined;
  const code = candidate?.code;
  if (code && CONTEXT_CODE_MESSAGES[context][code]) {
    return CONTEXT_CODE_MESSAGES[context][code];
  }

  return CONTEXT_DEFAULT_MESSAGES[context];
}
