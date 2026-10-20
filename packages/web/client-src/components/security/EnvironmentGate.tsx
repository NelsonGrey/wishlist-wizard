import { useMemo, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getEnvironmentGateAuth } from '@/lib/firebase';

// Authorized state is tracked here, deliberately separate from the app's own
// Firebase Auth user -- see getEnvironmentGateAuth in lib/firebase.ts.
const GATE_SESSION_KEY = 'ww:env-gate:authorized';
const GATE_EMAIL_KEY = 'ww:env-gate:email';

const parseList = (raw: string | undefined) =>
  (raw ?? '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

/**
 * Whether the gate applies. Production is never gated, and neither is a local
 * dev server -- localhost isn't a public attack surface.
 */
export function gateRequired(environment: string | undefined, hostname: string): boolean {
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(hostname)) return false;
  return environment === 'staging' || environment === 'development';
}

/** Fails closed: with no allowlist configured, nobody is authorized. */
export function isEmailAllowed(
  email: string | null | undefined,
  allowedEmails: string[],
  allowedDomains: string[],
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (allowedEmails.includes(normalized)) return true;
  const domain = normalized.split('@')[1];
  return Boolean(domain) && allowedDomains.includes(domain);
}

/**
 * Google Sign-In gate for the publicly reachable dev/staging deployments.
 * Same model as the EnvironmentGate in vehicle-vitals, modulo-squares, sprout
 * and balance-forward.
 *
 * Configured at build time via VITE_ALLOWED_EMAILS / VITE_ALLOWED_EMAIL_DOMAINS
 * (comma-separated). This is a UI-level gate: it keeps casual visitors out, but
 * the static bundle is still served. Real data protection comes from
 * Firestore/Storage rules and Auth.
 */
export default function EnvironmentGate({
  environment,
  children,
}: {
  environment: string;
  children: ReactNode;
}) {
  const requiresAuth =
    typeof window !== 'undefined' && gateRequired(environment, window.location.hostname);

  const [authorizedEmail, setAuthorizedEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(GATE_SESSION_KEY) === '1'
        ? sessionStorage.getItem(GATE_EMAIL_KEY) || ''
        : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const allowed = useMemo(
    () => ({
      emails: parseList(import.meta.env.VITE_ALLOWED_EMAILS),
      domains: parseList(import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS),
    }),
    [],
  );

  if (!requiresAuth) return <>{children}</>;

  const handleSignIn = async () => {
    setError('');
    setIsSigningIn(true);
    try {
      const gateAuth = await getEnvironmentGateAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(gateAuth, provider);
      const email = credential.user.email;

      if (isEmailAllowed(email, allowed.emails, allowed.domains)) {
        try {
          sessionStorage.setItem(GATE_SESSION_KEY, '1');
          sessionStorage.setItem(GATE_EMAIL_KEY, email ?? '');
        } catch {
          // sessionStorage unavailable -- works for this render, not a reload.
        }
        setAuthorizedEmail(email ?? '');
      } else {
        setError(`Your email (${email}) is not authorized to access this environment.`);
      }
      await signOut(gateAuth).catch(() => {});
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code !== 'auth/popup-closed-by-user') {
        setError(e.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRevoke = () => {
    try {
      sessionStorage.removeItem(GATE_SESSION_KEY);
      sessionStorage.removeItem(GATE_EMAIL_KEY);
    } catch {
      // ignore
    }
    setAuthorizedEmail(null);
  };

  if (authorizedEmail !== null) {
    return (
      <>
        {children}
        <button
          type="button"
          onClick={handleRevoke}
          title={`Team access granted to ${authorizedEmail}`}
          className="fixed bottom-4 right-4 z-50 rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg hover:opacity-90"
        >
          {authorizedEmail} (Revoke access)
        </button>
      </>
    );
  }

  const label = environment.charAt(0).toUpperCase() + environment.slice(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <section
        className="w-full max-w-lg rounded-lg border border-emerald-100 border-t-4 border-t-emerald-700 bg-white p-6 shadow-sm"
        data-testid="env-gate"
      >
        <div className="mb-5 flex items-center">
          <img src="/logo.svg" alt="" className="mr-2.5 h-9 w-9" />
          <span className="text-lg font-bold text-emerald-800">Wishlist Wizard</span>
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Restricted {environment} environment
        </p>
        <h1 className="text-xl font-semibold text-gray-900">Team access only</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in with an authorized Google account to view this {label.toLowerCase()} site.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </section>
    </main>
  );
}
