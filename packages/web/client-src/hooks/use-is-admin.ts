import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Whether the signed-in user holds the `super_admin` custom claim.
 * `null` while the check is in flight, `false` once resolved for a
 * non-admin (or signed-out) user, `true` for a confirmed super admin.
 */
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    user.getIdTokenResult().then((result) => {
      setIsAdmin(result.claims['role'] === 'super_admin');
    });
  }, [user]);

  return isAdmin;
}
