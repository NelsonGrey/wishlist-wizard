/**
 * Admin Dashboard — Overview
 *
 * Displays platform-wide statistics for super-admins: user counts by tier,
 * estimated MRR, open support tickets, and suspended accounts.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, AlertTriangle, TicketCheck, Shield } from 'lucide-react';

interface UserStats {
  users: {
    uid: string;
    email: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    isSuspended: boolean;
  }[];
}

function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsSuperAdmin(false); return; }
    user.getIdTokenResult().then((result) => {
      setIsSuperAdmin(result.claims['role'] === 'super_admin');
    });
  }, [user]);

  return isSuperAdmin;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const isSuperAdmin = useSuperAdmin();
  const [stats, setStats] = useState<{ byTier: Record<string, number>; suspended: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin === false) {
      setLocation('/app/dashboard');
      return;
    }
    if (isSuperAdmin !== true) return;

    const functions = getFunctions();
    const adminGetUsers = httpsCallable<object, UserStats>(functions, 'adminGetUsers');

    adminGetUsers({ pageSize: 100 })
      .then(({ data }) => {
        const byTier: Record<string, number> = {};
        let suspended = 0;
        for (const u of data.users) {
          byTier[u.subscriptionTier] = (byTier[u.subscriptionTier] ?? 0) + 1;
          if (u.isSuspended) suspended++;
        }
        setStats({ byTier, suspended, total: data.users.length });
      })
      .finally(() => setLoading(false));
  }, [isSuperAdmin, setLocation]);

  if (isSuperAdmin === null || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin dashboard…</div>
      </div>
    );
  }

  const tierOrder = ['free', 'starter', 'plus', 'creator', 'business', 'enterprise'];
  const monthlyRevenue: Record<string, number> = {
    starter: 3.99, plus: 7.99, creator: 14.99, business: 29.99,
  };
  const estimatedMRR = stats
    ? Object.entries(stats.byTier).reduce((acc, [tier, count]) => {
        return acc + (monthlyRevenue[tier] ?? 0) * count;
      }, 0)
    : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Super-Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform operations overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.total ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Est. MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${estimatedMRR.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Monthly recurring (approx.)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats?.suspended ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TicketCheck className="h-4 w-4" /> Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">View in Tickets tab</p>
          </CardContent>
        </Card>
      </div>

      {/* Users by tier */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Subscription Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {tierOrder.map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{tier}</Badge>
                <span className="font-semibold">{stats?.byTier[tier] ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation shortcuts */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setLocation('/admin/users')}>Manage Users</Button>
        <Button variant="outline" onClick={() => setLocation('/admin/tickets')}>Support Tickets</Button>
        <Button variant="outline" onClick={() => setLocation('/admin/audit-log')}>Audit Log</Button>
      </div>
    </div>
  );
}
