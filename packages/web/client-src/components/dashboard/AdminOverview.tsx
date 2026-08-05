import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, AlertTriangle, TicketCheck } from 'lucide-react';
import StatCard from '@/components/StatCard';

interface UserStats {
  users: {
    uid: string;
    email: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    isSuspended: boolean;
  }[];
}

// Only rendered once the caller has already confirmed super-admin access
// (see Dashboard.tsx's useIsAdmin gate) — no client-side re-check here.
export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<{ byTier: Record<string, number>; suspended: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/users', { method: 'POST', body: { pageSize: 100 } })
      .then((result) => {
        const data = result as UserStats;
        const byTier: Record<string, number> = {};
        let suspended = 0;
        for (const u of data.users) {
          byTier[u.subscriptionTier] = (byTier[u.subscriptionTier] ?? 0) + 1;
          if (u.isSuspended) suspended++;
        }
        setStats({ byTier, suspended, total: data.users.length });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin overview…</div>
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
    <div className="space-y-6" data-testid="admin-overview">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.total ?? '—'} icon={<Users className="h-4 w-4" />} />
        <StatCard
          label="Est. MRR"
          value={`$${estimatedMRR.toFixed(0)}`}
          icon={<CreditCard className="h-4 w-4" />}
        />
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
        <StatCard label="Support Tickets" value="—" icon={<TicketCheck className="h-4 w-4" />} />
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
