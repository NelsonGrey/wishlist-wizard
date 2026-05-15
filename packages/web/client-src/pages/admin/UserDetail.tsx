/**
 * Admin — User Detail
 *
 * View detailed user profile, subscription, and perform admin actions.
 */
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { User, ArrowLeft } from 'lucide-react';

interface UserDetail {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isSuspended: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: { _seconds: number };
}

const TIERS = ['free', 'starter', 'plus', 'creator', 'business', 'enterprise'] as const;
const TIER_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-900',
  starter: 'bg-blue-100 text-blue-900',
  plus: 'bg-purple-100 text-purple-900',
  creator: 'bg-orange-100 text-orange-900',
  business: 'bg-red-100 text-red-900',
  enterprise: 'bg-black text-white',
};

function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) { setIsSuperAdmin(false); return; }
    user.getIdTokenResult().then((r) => setIsSuperAdmin(r.claims['role'] === 'super_admin'));
  }, [user]);
  return isSuperAdmin;
}

export default function UserDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const isSuperAdmin = useSuperAdmin();
  const { toast } = useToast();
  const uid = params.uid as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [tierDialog, setTierDialog] = useState(false);
  const [newTier, setNewTier] = useState('');
  const [tierReason, setTierReason] = useState('');
  const [acting, setActing] = useState(false);

  const functions = getFunctions();

  useEffect(() => {
    if (isSuperAdmin === false) { setLocation('/app/dashboard'); return; }
    if (isSuperAdmin !== true) return;

    setLoading(true);
    const fn = httpsCallable<object, UserDetail>(functions, 'adminGetUser');
    fn({ targetUid: uid })
      .then(({ data }) => setUser(data))
      .catch((err) => {
        toast({ title: 'Error', description: err?.message, variant: 'destructive' });
        setLocation('/admin/users');
      })
      .finally(() => setLoading(false));
  }, [isSuperAdmin, uid, setLocation]);

  async function handleSuspend() {
    if (!user || !suspendReason.trim()) return;
    setActing(true);
    try {
      const fn = httpsCallable(functions, 'adminSuspendUser');
      await fn({ targetUid: uid, reason: suspendReason });
      setUser({ ...user, isSuspended: true });
      toast({ title: 'User suspended' });
      setSuspendDialog(false);
      setSuspendReason('');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }

  async function handleUnsuspend() {
    if (!user) return;
    setActing(true);
    try {
      const fn = httpsCallable(functions, 'adminUnsuspendUser');
      await fn({ targetUid: uid, reason: 'Admin reinstatement' });
      setUser({ ...user, isSuspended: false });
      toast({ title: 'User reinstated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }

  async function handleTierChange() {
    if (!user || !newTier || !tierReason.trim()) return;
    setActing(true);
    try {
      const fn = httpsCallable(functions, 'adminModifySubscription');
      await fn({ targetUid: uid, newTier, reason: tierReason });
      setUser({ ...user, subscriptionTier: newTier });
      toast({ title: 'Subscription tier updated' });
      setTierDialog(false);
      setNewTier('');
      setTierReason('');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }

  if (isSuperAdmin === null || loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64 text-destructive">User not found</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            User Details
          </h1>
          <p className="text-sm text-muted-foreground">{user.uid}</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Display Name</p>
              <p className="font-semibold">{user.displayName ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Status</p>
              <p className="font-semibold">
                {user.isSuspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <div className="mt-1">
                <Badge className={`${TIER_COLORS[user.subscriptionTier]} capitalize`}>
                  {user.subscriptionTier}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{user.subscriptionStatus.replace('_', ' ')}</p>
            </div>
            {user.currentPeriodEnd && (
              <div>
                <p className="text-sm text-muted-foreground">Next Renewal</p>
                <p className="font-semibold">
                  {new Date(user.currentPeriodEnd._seconds * 1000).toLocaleDateString()}
                </p>
              </div>
            )}
            {user.stripeCustomerId && (
              <div>
                <p className="text-sm text-muted-foreground">Stripe Customer</p>
                <p className="font-mono text-xs">{user.stripeCustomerId.slice(0, 20)}…</p>
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Usage</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Wishlists</span>
                <span className="text-muted-foreground">
                  {user.usage.wishlistsOwned ?? 0} / {user.limits.maxWishlists ?? '∞'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Items Tracked</span>
                <span className="text-muted-foreground">
                  {user.usage.itemsTracked ?? 0} / {user.limits.maxPriceTrackedItems ?? '∞'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4 space-y-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setTierDialog(true)}
            >
              Override Tier
            </Button>
            {!user.isSuspended ? (
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => setSuspendDialog(true)}
              >
                Suspend Account
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleUnsuspend}
                disabled={acting}
              >
                Reinstate Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will prevent the user from logging in and accessing their account.
          </p>
          <Textarea
            placeholder="Reason for suspension…"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || acting}
              onClick={handleSuspend}
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Change Dialog */}
      <Dialog open={tierDialog} onOpenChange={setTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Subscription Tier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Current tier: <span className="font-semibold capitalize">{user.subscriptionTier}</span>
          </p>
          <Select value={newTier} onValueChange={setNewTier}>
            <SelectTrigger>
              <SelectValue placeholder="Select new tier" />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((tier) => (
                <SelectItem key={tier} value={tier} className="capitalize">
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Reason for tier change…"
            value={tierReason}
            onChange={(e) => setTierReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialog(false)}>Cancel</Button>
            <Button
              disabled={!newTier || !tierReason.trim() || acting}
              onClick={handleTierChange}
            >
              Apply Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
