/**
 * Admin — User Management
 *
 * Paginated user table with search, subscription details, and actions
 * (view detail, suspend, unsuspend, override subscription tier).
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Search, AlertTriangle } from 'lucide-react';

interface UserRow {
  uid: string;
  email: string;
  displayName: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isSuspended: boolean;
  createdAt: Date | string;
}

const TIER_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  free: 'outline',
  starter: 'secondary',
  plus: 'secondary',
  creator: 'default',
  business: 'default',
  enterprise: 'default',
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

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const isSuperAdmin = useSuperAdmin();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [acting, setActing] = useState(false);

  const functions = getFunctions();

  useEffect(() => {
    if (isSuperAdmin === false) { setLocation('/app/dashboard'); return; }
    if (isSuperAdmin !== true) return;

    const adminGetUsers = httpsCallable<object, { users: UserRow[] }>(functions, 'adminGetUsers');
    adminGetUsers({ pageSize: 100 })
      .then(({ data }) => setUsers(data.users))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, setLocation]);

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSuspend() {
    if (!suspendTarget || !suspendReason.trim()) return;
    setActing(true);
    try {
      const fn = httpsCallable(functions, 'adminSuspendUser');
      await fn({ targetUid: suspendTarget.uid, reason: suspendReason });
      setUsers((prev) =>
        prev.map((u) => u.uid === suspendTarget.uid ? { ...u, isSuspended: true } : u),
      );
      toast({ title: 'User suspended', description: suspendTarget.email });
      setSuspendTarget(null);
      setSuspendReason('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suspend user';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }

  async function handleUnsuspend(user: UserRow) {
    setActing(true);
    try {
      const fn = httpsCallable(functions, 'adminUnsuspendUser');
      await fn({ targetUid: user.uid });
      setUsers((prev) =>
        prev.map((u) => u.uid === user.uid ? { ...u, isSuspended: false } : u),
      );
      toast({ title: 'User reinstated', description: user.email });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsuspend';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  }

  if (isSuperAdmin === null || loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Suspended</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell>
              </TableRow>
            )}
            {filtered.map((user) => (
              <TableRow key={user.uid} className={user.isSuspended ? 'opacity-60' : ''}>
                <TableCell className="font-mono text-xs">{user.email}</TableCell>
                <TableCell>{user.displayName || '—'}</TableCell>
                <TableCell>
                  <Badge variant={TIER_BADGE_VARIANT[user.subscriptionTier] ?? 'outline'} className="capitalize">
                    {user.subscriptionTier}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{user.subscriptionStatus}</TableCell>
                <TableCell>
                  {user.isSuspended && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/admin/users/${user.uid}`)}
                  >
                    View Details
                  </Button>
                  {user.isSuspended ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={acting}
                      onClick={() => handleUnsuspend(user)}
                    >
                      Reinstate
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSuspendTarget(user)}
                    >
                      Suspend
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Suspend dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspendTarget?.email}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The user will be immediately signed out and unable to sign in until reinstated.
            This action is logged in the audit trail.
          </p>
          <Input
            placeholder="Reason for suspension (required)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || acting}
              onClick={handleSuspend}
            >
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
