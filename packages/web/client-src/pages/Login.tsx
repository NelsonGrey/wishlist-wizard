import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage, isAccountExistsWithDifferentCredentialError } from "@/lib/firebase-auth-errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleIcon, AppleIcon } from "@/components/auth/OAuthIcons";
import { useAppOffline } from "@/hooks/useAppOffline";
import AppOfflineNotice from "@/components/AppOfflineNotice";

// Define form validation schema - Updated for Firebase Auth (email instead of username)
const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type OAuthProviderId = 'google.com' | 'apple.com';

export default function Login() {
  const isAppOffline = useAppOffline();
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProviderId | null>(null);
  // Set when a Google/Apple attempt collides with an existing password
  // account. AuthContext stashes the OAuth credential and links it
  // automatically the moment the password sign-in below succeeds — Firebase's
  // email enumeration protection means we can't know the email up front, so
  // this banner stays provider-agnostic rather than naming the account.
  const [showLinkBanner, setShowLinkBanner] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  // Initialize form with react-hook-form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const completeSignIn = () => {
    const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
    const redirectTo = storedRedirect || '/app/wishlists';
    sessionStorage.removeItem('redirectAfterAuth');

    toast({
      title: "Login successful",
      description: "You are now logged in.",
    });

    setLocation(redirectTo);
  };

  // Handle form submission with Firebase Auth
  const onSubmit = async (data: LoginFormValues) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await signIn(data.email.trim(), data.password);
      if (showLinkBanner) {
        setShowLinkBanner(false);
        toast({
          title: "Account linked",
          description: "Your accounts are now linked — sign in with either method going forward.",
        });
      }
      completeSignIn();
    } catch (error: unknown) {
      console.error("Login error:", error);

      toast({
        title: "Login failed",
        description: getFirebaseAuthErrorMessage(error, "login"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (providerId: OAuthProviderId) => {
    if (oauthLoading) {
      return;
    }

    setOauthLoading(providerId);
    try {
      if (providerId === 'google.com') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      completeSignIn();
    } catch (error: unknown) {
      console.error("OAuth sign-in error:", error);

      if (isAccountExistsWithDifferentCredentialError(error)) {
        setShowLinkBanner(true);
        toast({
          title: "Account already exists",
          description: "Sign in with your password below to link this to your existing account.",
        });
        return;
      }

      toast({
        title: "Sign-in failed",
        description: getFirebaseAuthErrorMessage(error, "login"),
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
    }
  };

  if (isAppOffline) {
    return <AppOfflineNotice />;
  }

  return (
    <div className="container flex justify-center py-1">
      <Card className="w-full max-w-md border-emerald-200/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in to Wishlist Wizard</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your wishlists
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showLinkBanner && (
            <Alert className="mb-4" data-testid="oauth-link-banner">
              <AlertDescription>
                An account already exists with this email using a password. Sign in below and
                we&apos;ll link your Google/Apple sign-in to it automatically.
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="login-email-input"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        className="focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="login-password-input"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                data-testid="login-submit"
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : showLinkBanner ? "Sign in & link account" : "Sign in"}
              </Button>
            </form>
          </Form>

          {!showLinkBanner && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="login-google"
                  disabled={oauthLoading !== null}
                  onClick={() => handleOAuthSignIn('google.com')}
                  className="flex items-center gap-2"
                >
                  <GoogleIcon />
                  {oauthLoading === 'google.com' ? "Signing in..." : "Google"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  data-testid="login-apple"
                  disabled={oauthLoading !== null}
                  onClick={() => handleOAuthSignIn('apple.com')}
                  className="flex items-center gap-2"
                >
                  <AppleIcon />
                  {oauthLoading === 'apple.com' ? "Signing in..." : "Apple"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            <Button
              type="button"
              variant="link"
              className="p-0 text-emerald-700 hover:text-emerald-800"
              onClick={() => setLocation("/forgot-password")}
            >
              Forgot your password?
            </Button>
          </div>
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 text-emerald-700 hover:text-emerald-800"
              onClick={() => setLocation("/register")}
            >
              Register
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}