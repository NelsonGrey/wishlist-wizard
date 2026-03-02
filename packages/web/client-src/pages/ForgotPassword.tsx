import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
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
              
              <div className="text-center">
                <Button 
                  type="button"
                  variant="link" 
                  onClick={() => setStatus('form')}
                  className="text-sm"
                >
                  Didn&apos;t receive an email? Try again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
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
              className="w-full"
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
                className="text-sm"
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