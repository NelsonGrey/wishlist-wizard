import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'wouter';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError('');
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('Email is required.');
      isSubmittingRef.current = false;
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      isSubmittingRef.current = false;
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);

    try {
      await signIn(normalizedEmail, password);
      // ProtectedRoute will handle redirect after auth state change
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err, 'login'));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <div role="alert" className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <button
          onClick={() => setLocation('/forgot-password')}
          className="text-emerald-700 hover:text-emerald-800"
        >
          Forgot your password?
        </button>
      </div>

      <div className="mt-2 text-center text-sm">
        <span className="text-gray-600">Don&apos;t have an account? </span>
        <button
          onClick={() => setLocation('/signup')}
          className="text-emerald-700 hover:text-emerald-800 font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
