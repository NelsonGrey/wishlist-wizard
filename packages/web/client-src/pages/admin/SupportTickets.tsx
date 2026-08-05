/**
 * Admin — Support Tickets
 *
 * Lists open support tickets and allows admins to respond and change status.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TicketCheck } from 'lucide-react';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  category: string;
  subject: string;
  priority: string;
  status: string;
  assignedTo?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  context?: { subscriptionTier?: string };
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  in_progress: 'default',
  waiting_user: 'secondary',
  resolved: 'outline',
  closed: 'outline',
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

export default function SupportTickets() {
  const [, setLocation] = useLocation();
  const isSuperAdmin = useSuperAdmin();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (isSuperAdmin === false) { setLocation('/app/dashboard'); return; }
    if (isSuperAdmin !== true) return;

    apiRequest('/api/admin/support-tickets', { method: 'POST', body: { pageSize: 50 } })
      .then((data) => setTickets((data as { tickets: SupportTicket[] }).tickets))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, setLocation]);

  async function handleReply() {
    if (!replyTarget || !replyMessage.trim()) return;
    setActing(true);
    try {
      await apiRequest(`/api/admin/support-tickets/${replyTarget.id}/respond`, {
        method: 'POST',
        body: {
          message: replyMessage,
          newStatus: newStatus || undefined,
        },
      });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === replyTarget.id
            ? { ...t, status: newStatus || t.status, updatedAt: new Date() }
            : t,
        ),
      );
      toast({ title: 'Reply sent' });
      setReplyTarget(null);
      setReplyMessage('');
      setNewStatus('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
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
        <TicketCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Support Tickets</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No tickets</TableCell>
              </TableRow>
            )}
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                <TableCell className="text-xs font-mono">{ticket.userEmail}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {ticket.context?.subscriptionTier ?? '—'}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{ticket.category}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[ticket.status] ?? 'outline'} className="capitalize">
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setReplyTarget(ticket)}>
                    Respond
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reply dialog */}
      <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Respond to: {replyTarget?.subject}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">From: {replyTarget?.userEmail}</p>
          <Textarea
            placeholder="Your reply…"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={5}
          />
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Change status (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_user">Waiting on User</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyTarget(null)}>Cancel</Button>
            <Button disabled={!replyMessage.trim() || acting} onClick={handleReply}>
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
