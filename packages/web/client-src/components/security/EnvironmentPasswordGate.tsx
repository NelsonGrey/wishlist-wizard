import { FormEvent, useMemo, useState } from 'react';

interface EnvironmentPasswordGateProps {
  environment: string;
  requiredPassword: string;
  children: React.ReactNode;
}

function normalizeEnvironment(value: string): string {
  return String(value || '').trim().toLowerCase() || 'development';
}

export default function EnvironmentPasswordGate({
  environment,
  requiredPassword,
  children,
}: EnvironmentPasswordGateProps) {
  const normalizedEnvironment = normalizeEnvironment(environment);

  const requiresProtection = normalizedEnvironment !== 'production' && normalizedEnvironment !== 'test';

  const storageKey = useMemo(
    () => `ww:env-password-unlocked:${normalizedEnvironment}`,
    [normalizedEnvironment]
  );

  const [inputPassword, setInputPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!requiresProtection) {
      return true;
    }

    try {
      return sessionStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState('');

  if (!requiresProtection) {
    return <>{children}</>;
  }

  const trimmedRequiredPassword = String(requiredPassword || '').trim();

  if (!trimmedRequiredPassword) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <section className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-sm" data-testid="env-password-misconfigured">
          <h1 className="text-xl font-semibold text-gray-900">Environment Is Locked</h1>
          <p className="mt-3 text-sm text-gray-600">
            Password protection is enabled for the {normalizedEnvironment} environment, but no password is configured.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Set VITE_NON_PROD_SITE_PASSWORD at build time for this environment to unlock access.
          </p>
        </section>
      </main>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (inputPassword === trimmedRequiredPassword) {
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {
        // Ignore storage errors and keep unlocked for this runtime session.
      }
      setIsUnlocked(true);
      setError('');
      setInputPassword('');
      return;
    }

    setError('Incorrect password.');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <section className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-sm" data-testid="env-password-gate">
        <h1 className="text-xl font-semibold text-gray-900">Protected Environment</h1>
        <p className="mt-2 text-sm text-gray-600">
          The {normalizedEnvironment} environment is password protected.
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="environment-password-input">
            Environment Password
          </label>
          <input
            id="environment-password-input"
            type="password"
            value={inputPassword}
            onChange={(event) => setInputPassword(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            autoFocus
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Unlock Environment
          </button>
        </form>
      </section>
    </main>
  );
}
