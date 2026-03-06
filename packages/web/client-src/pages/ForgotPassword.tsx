import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { resetPassword } = useAuth();
  
  const [status, setStatus] = useState<'form' | 'loading' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') {
      return;
    }

    const normalizedEmail = email.trim();
    
    if (!normalizedEmail) {
      setMessage('Please enter your email address');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await resetPassword(normalizedEmail);
      setStatus('success');
    } catch (error: unknown) {
      setStatus('form');
      setMessage(getFirebaseAuthErrorMessage(error, 'reset-password'));
    }
  };

  if (status === 'success') {
    return (
      <div className="container flex items-center justify-center min-h-[80vh] py-8">
        <Card className="w-full max-w-md border-emerald-200/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-center">Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                If an account with that email exists, we&apos;ve sent you a password reset link.
              </p>
              <p className="text-sm text-gray-500">
                Check your email and click the link to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              <Button type="button" onClick={() => setLocation('/login')} className="w-full">
                Back to Login
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setStatus('form')}
              className="p-0 text-sm text-emerald-700 hover:text-emerald-800"
            >
              Didn&apos;t receive an email? Try again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-8">
      <Card className="w-full max-w-md border-emerald-200/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                data-testid="forgot-password-email-input"
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                disabled={status === 'loading'}
              />
            </div>

            {message && (
              <div data-testid="forgot-password-message" role="alert" aria-live="assertive" className="text-sm text-red-600">
                {message}
              </div>
            )}

            <Button
              data-testid="forgot-password-submit"
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center">
                <Button
                type="button"
                  variant="link"
                onClick={() => setLocation('/login')}
                  className="p-0 text-sm text-emerald-700 hover:text-emerald-800"
                disabled={status === 'loading'}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}