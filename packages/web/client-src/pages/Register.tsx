import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define form validation schema - Updated for Firebase Auth
const registerSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signUp } = useAuth();

  // Initialize form with react-hook-form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle form submission with Firebase Auth
  const onSubmit = async (data: RegisterFormValues) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await signUp(data.email.trim(), data.password, data.displayName?.trim() || undefined);
      
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully!",
      });
      
      // Redirect will be handled by ProtectedRoute and auth state change
    } catch (error: unknown) {
      console.error("Registration error:", error);

      toast({
        title: "Registration failed",
        description: getFirebaseAuthErrorMessage(error, "signup"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex justify-center py-4">
      <Card className="w-full max-w-md border-emerald-200/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to create a Wishlist Wizard account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="register-display-name-input"
                        autoComplete="name"
                        placeholder="Your display name"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="register-email-input"
                        type="email"
                        autoComplete="email"
                        placeholder="your.email@example.com"
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
                        data-testid="register-password-input"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="register-confirm-password-input"
                        type="password"
                        autoComplete="new-password"
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
                data-testid="register-submit"
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 text-emerald-700 hover:text-emerald-800"
              onClick={() => setLocation("/login")}
            >
              Sign in
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}