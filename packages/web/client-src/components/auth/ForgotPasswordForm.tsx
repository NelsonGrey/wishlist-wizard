import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'wouter';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const { resetPassword } = useAuth();
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
    setMessage('');
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

    setLoading(true);

    try {
      await resetPassword(normalizedEmail);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err, 'reset-password'));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
      
      <p className="text-gray-600 text-sm mb-6 text-center">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

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

        {error && (
          <div role="alert" className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="text-green-600 text-sm mt-2 p-2 bg-green-50 border border-green-200 rounded">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm space-y-2">
        <button
          onClick={() => setLocation('/login')}
          className="text-emerald-700 hover:text-emerald-800"
        >
          Back to Sign In
        </button>
        <br />
        <button
          onClick={() => setLocation('/signup')}
          className="text-emerald-700 hover:text-emerald-800"
        >
          Don&apos;t have an account? Sign up
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;