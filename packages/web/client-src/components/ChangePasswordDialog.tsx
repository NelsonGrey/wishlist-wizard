import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePasswordPolicy } from "@/hooks/usePasswordPolicy";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  // zod still needs some rule, but the real gating happens via
  // usePasswordPolicy's quickCheck (on submit) and the authoritative
  // checkPolicy() against the live Firebase policy right before updatePassword().
  newPassword: z.string().min(1, "New password is required"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ChangePasswordDialog({ open, onOpenChange, onSuccess }: ChangePasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { checkPasswordPolicy, reauthenticateWithPassword, updatePassword } = useAuth();
  const { hint, quickCheck, checkPolicy, describeFailure } = usePasswordPolicy(checkPasswordPolicy);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setFormError('');
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (isSubmitting) {
      return;
    }

    // Quick client-side pass using the cached live policy, for immediate
    // feedback without a network round-trip.
    const quickCheckError = quickCheck(data.newPassword);
    if (quickCheckError) {
      form.setError("newPassword", { type: "manual", message: quickCheckError });
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      // Firebase requires a "recent login" before allowing updatePassword();
      // re-authenticate with the current password first.
      try {
        await reauthenticateWithPassword(data.currentPassword);
      } catch (error: unknown) {
        // Reauth failures are sign-in-shaped errors (wrong password, too
        // many attempts, etc.) -- reuse the 'login' error-code mapping.
        form.setError("currentPassword", {
          type: "manual",
          message: getFirebaseAuthErrorMessage(error, "login"),
        });
        return;
      }

      // Authoritative check against the live Firebase policy -- catches
      // drift between the cached copy and the real policy before spending a
      // round-trip on the password update.
      const status = await checkPolicy(data.newPassword);
      if (!status.isValid) {
        form.setError("newPassword", { type: "manual", message: describeFailure(status) });
        return;
      }

      try {
        await updatePassword(data.newPassword);
      } catch (error: unknown) {
        // Update failures are signup-shaped errors (weak-password,
        // requires-recent-login, etc.) -- reuse the 'signup' error-code mapping.
        setFormError(getFirebaseAuthErrorMessage(error, "signup"));
        return;
      }

      onSuccess?.();
      handleOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password, then choose a new one.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="change-password-current-input"
                      type="password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="change-password-new-input"
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground" data-testid="change-password-hint">
                    {hint}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="change-password-confirm-input"
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <div role="alert" className="text-sm text-red-600" data-testid="change-password-error">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="change-password-submit">
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
