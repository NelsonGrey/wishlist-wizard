type AuthErrorContext = 'login' | 'signup' | 'reset-password';

const FIREBASE_NOT_CONFIGURED_MESSAGE = 'Firebase is not configured for this environment. Ask your admin to set VITE_FIREBASE_* env vars.';

const CONTEXT_DEFAULT_MESSAGES: Record<AuthErrorContext, string> = {
  login: 'Failed to sign in. Please try again.',
  signup: 'Failed to create account. Please try again.',
  'reset-password': 'Failed to send password reset email. Please try again.',
};

const CONTEXT_CODE_MESSAGES: Record<AuthErrorContext, Record<string, string>> = {
  login: {
    'app/firebase-not-configured': FIREBASE_NOT_CONFIGURED_MESSAGE,
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  },
  signup: {
    'app/firebase-not-configured': FIREBASE_NOT_CONFIGURED_MESSAGE,
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
  },
  'reset-password': {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many requests. Please try again later.',
  },
};

export function getFirebaseAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  const candidate = (typeof error === 'object' && error !== null) ? (error as { code?: string }) : undefined;
  const code = candidate?.code;
  if (code && CONTEXT_CODE_MESSAGES[context][code]) {
    return CONTEXT_CODE_MESSAGES[context][code];
  }

  return CONTEXT_DEFAULT_MESSAGES[context];
}
