import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
  const params = useParams();
  const token = params.token;
  const [, setLocation] = useLocation();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verifyEmail = async () => {
      try {
        await apiRequest(`/api/auth/verify-email/${token}`);
        setStatus('success');
        setMessage('Your email has been successfully verified!');
      } catch (error) {
        setStatus('error');
        if (error instanceof Error) {
          setMessage(error.message);
        } else {
          setMessage('Failed to verify email. The link may be expired or invalid.');
        }
      }
    };

    verifyEmail();
  }, [token]);

  const handleContinue = () => {
    if (status === 'success') {
      setLocation('/login');
    } else {
      setLocation('/register');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your email address...'}
            {status === 'success' && 'Email verification successful'}
            {status === 'error' && 'Email verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-gray-600">{message}</p>
          </div>

          {status !== 'loading' && (
            <div className="space-y-4">
              <Button
                onClick={handleContinue}
                className="w-full"
                variant={status === 'success' ? 'default' : 'outline'}
              >
                {status === 'success' ? 'Continue to Login' : 'Back to Registration'}
              </Button>
              
              {status === 'error' && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Need a new verification email?
                  </p>
                  <Button 
                    variant="link" 
                    onClick={() => setLocation('/register')}
                    className="text-sm"
                  >
                    Create a new account
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}