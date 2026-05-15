/**
 * Admin — Audit Log Viewer
 *
 * Displays the immutable audit trail with filters for resource type and actor.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollText } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  resourceType: string;
  resourceId: string;
  reason?: string;
  timestamp: { _seconds: number } | null;
}

function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) { setIsSuperAdmin(false); return; }
    user.getIdTokenResult().then((r) => setIsSuperAdmin(r.claims['role'] === 'super_admin'));
  }, [user]);
  return isSuperAdmin;
}

function formatTimestamp(ts: { _seconds: number } | null): string {
  if (!ts) return '—';
  return new Date(ts._seconds * 1000).toLocaleString();
}

export default function AuditLog() {
  const [, setLocation] = useLocation();
  const isSuperAdmin = useSuperAdmin();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceType, setResourceType] = useState('');
  const [actorUid, setActorUid] = useState('');

  const functions = getFunctions();

  function load() {
    if (isSuperAdmin !== true) return;
    setLoading(true);
    const fn = httpsCallable<object, { entries: AuditEntry[] }>(functions, 'adminGetAuditLog');
    fn({
      pageSize: 100,
      filter: {
        ...(resourceType ? { resourceType } : {}),
        ...(actorUid.trim() ? { actorUid: actorUid.trim() } : {}),
      },
    })
      .then(({ data }) => setEntries(data.entries))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isSuperAdmin === false) { setLocation('/app/dashboard'); return; }
    if (isSuperAdmin === true) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  if (isSuperAdmin === null) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Resource type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="ticket">Ticket</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by actor UID…"
          value={actorUid}
          onChange={(e) => setActorUid(e.target.value)}
          className="w-64"
        />

        <Button onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Apply Filters'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No audit entries found</TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatTimestamp(entry.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">{entry.action}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono max-w-[120px] truncate">{entry.actorUid}</TableCell>
                <TableCell className="capitalize text-xs">{entry.actorRole}</TableCell>
                <TableCell className="text-xs">
                  <span className="capitalize">{entry.resourceType}</span>
                  <span className="text-muted-foreground ml-1 font-mono truncate max-w-[80px] inline-block">
                    /{entry.resourceId.slice(0, 8)}
                  </span>
                </TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{entry.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
