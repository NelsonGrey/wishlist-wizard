import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePasswordPolicy } from "@/hooks/usePasswordPolicy";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

type Status = 'verifying' | 'form' | 'loading' | 'success' | 'error';

/**
 * Reads Firebase's standard action-link query params. The reset email is
 * sent with actionCodeSettings pointing back at this page (see
 * lib/firebase.ts resetPassword()), so a real link always includes these —
 * `mode=resetPassword&oobCode=...` — rather than the old custom `token`
 * param this page used to expect.
 */
function getResetLinkParams(): { mode: string | null; oobCode: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode'),
    oobCode: params.get('oobCode'),
  };
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { verifyResetPasswordCode, confirmResetPassword, checkPasswordPolicy } = useAuth();
  const { hint, quickCheck } = usePasswordPolicy(checkPasswordPolicy);

  const [oobCode, setOobCode] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const { mode, oobCode: code } = getResetLinkParams();

    if (mode !== 'resetPassword' || !code) {
      setStatus('error');
      setMessage('Invalid password reset link');
      return;
    }

    setOobCode(code);

    let cancelled = false;
    verifyResetPasswordCode(code)
      .then((email) => {
        if (cancelled) return;
        setAccountEmail(email);
        setStatus('form');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(getFirebaseAuthErrorMessage(error, 'confirm-reset-password'));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oobCode) {
      return;
    }

    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    const quickCheckError = quickCheck(password);
    if (quickCheckError) {
      setMessage(quickCheckError);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await confirmResetPassword(oobCode, password);
      setStatus('success');
      setMessage('Your password has been successfully reset!');
    } catch (error: unknown) {
      setStatus('form');
      setMessage(getFirebaseAuthErrorMessage(error, 'confirm-reset-password'));
    }
  };

  const handleContinue = () => {
    setLocation('/login');
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden="true" />
            <p className="text-gray-600" role="status" aria-live="polite">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
            <CardDescription>Your password has been updated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>

            <div className="text-center">
              <p className="text-gray-600">{message}</p>
            </div>

            <Button type="button" onClick={handleContinue} className="w-full">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>

            <div className="text-center">
              <p className="text-gray-600" role="alert" aria-live="assertive">{message || 'The password reset link is invalid or has expired.'}</p>
            </div>

            <Button type="button" onClick={() => setLocation('/forgot-password')} className="w-full" variant="outline">
              Request a New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            {accountEmail ? `Enter a new password for ${accountEmail}` : 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={status === 'loading'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={status === 'loading'}
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500" data-testid="reset-password-hint">
                {hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={status === 'loading'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={status === 'loading'}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            {message && (
              <div role="alert" aria-live="assertive" className="text-sm text-red-600">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
