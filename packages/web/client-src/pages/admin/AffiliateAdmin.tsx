/**
 * Admin tooling for the affiliate/creator commission system: CSV report
 * import, tracking-ID pool management, and payout batch review. Individual
 * actions are gated server-side per-callable via requireAdminRole (billing_
 * admin/super_admin for mutations; broader read access for listings) — this
 * page doesn't duplicate that logic client-side, it just renders what the
 * server allows and surfaces a clear error toast if a specific caller's role
 * isn't sufficient for a specific action.
 */
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Upload, RefreshCw } from "lucide-react";

const NETWORKS = ["Amazon Associates"] as const;

type ImportJob = {
  id: string;
  network: string;
  status: "processing" | "completed" | "failed";
  rowCount: number;
  matchedCount: number;
  unmatchedCount: number;
  newEntriesCount: number;
  updatedEntriesCount: number;
  reversalsDetectedCount: number;
  createdAt: string;
};

type PayoutBatch = {
  id: string;
  creatorUserId: string;
  state: string;
  totalAmountUsd: number;
  periodLabel: string;
  createdAt: string;
};

type PoolId = {
  id: string;
  trackingId: string;
  status: "available" | "assigned";
  assignedToUid: string | null;
};

function errorMessage(error: unknown): string {
  return (error as any)?.message || "Something went wrong. Please try again.";
}

function ImportsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [network, setNetwork] = useState<string>(NETWORKS[0]);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading } = useQuery<{ imports: ImportJob[] }>({
    queryKey: ["/api/admin/affiliate/imports/list"],
    queryFn: () => apiRequest("/api/admin/affiliate/imports/list") as Promise<{ imports: ImportJob[] }>,
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: (importId: string) => apiRequest("/api/admin/affiliate/imports/retry", { method: "POST", body: { importId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate/imports/list"] }),
    onError: (error) => toast({ title: "Retry failed", description: errorMessage(error), variant: "destructive" }),
  });

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { uploadUrl } = (await apiRequest("/api/admin/affiliate/imports/request-upload-url", {
        method: "POST",
        body: { network, filename: file.name },
      })) as { uploadUrl: string; importId: string };

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "text/csv" },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);

      toast({ title: "Upload started", description: "The report is being reconciled — this list refreshes automatically." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate/imports/list"] });
    } catch (error) {
      toast({ title: "Upload failed", description: errorMessage(error), variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import a retailer report</CardTitle>
          <CardDescription>Upload a CSV export from an affiliate network to reconcile commissions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-64">
            <label className="text-sm font-medium">Network</label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="mr-2 h-4 w-4" /> {isUploading ? "Uploading…" : "Upload CSV"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data?.imports || data.imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Matched</TableHead>
                  <TableHead className="text-right">Unmatched</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Reversals</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.imports.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.network}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "destructive" : "outline"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{job.rowCount}</TableCell>
                    <TableCell className="text-right">{job.matchedCount}</TableCell>
                    <TableCell className="text-right">{job.unmatchedCount}</TableCell>
                    <TableCell className="text-right">{job.newEntriesCount}</TableCell>
                    <TableCell className="text-right">{job.reversalsDetectedCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(job.createdAt), "MMM d, h:mm a")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => retryMutation.mutate(job.id)} disabled={retryMutation.isPending}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrackingPoolTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState<string>(NETWORKS[0]);
  const [bulkInput, setBulkInput] = useState("");

  const { data, isLoading } = useQuery<{ ids: PoolId[] }>({
    queryKey: ["/api/admin/affiliate/tracking-pool/list", network],
    queryFn: () => apiRequest("/api/admin/affiliate/tracking-pool/list", { body: { network } }) as Promise<{ ids: PoolId[] }>,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/affiliate/tracking-pool/add", {
        method: "POST",
        body: { network, trackingIds: bulkInput.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) },
      }),
    onSuccess: (result: any) => {
      toast({ title: "Tracking IDs added", description: `${result.added} added, ${result.skippedExisting} already in the pool.` });
      setBulkInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate/tracking-pool/list"] });
    },
    onError: (error) => toast({ title: "Failed to add tracking IDs", description: errorMessage(error), variant: "destructive" }),
  });

  const available = data?.ids?.filter((id) => id.status === "available").length ?? 0;
  const assigned = data?.ids?.filter((id) => id.status === "assigned").length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tracking ID pool</CardTitle>
          <CardDescription>
            Amazon Tracking IDs must be created in Associates Central first (capped ~100/account) — paste already-created
            IDs here to make them assignable to creators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-full sm:w-64">
            <label className="text-sm font-medium">Network</label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="One tracking ID per line (e.g. wishlistwiz-01-20)"
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
            rows={4}
          />
          <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !bulkInput.trim()}>
            Add to pool
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Pool status — {available} available, {assigned} assigned
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data?.ids || data.ids.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracking IDs in the pool yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ids.map((id) => (
                  <TableRow key={id.id}>
                    <TableCell className="font-mono text-sm">{id.trackingId}</TableCell>
                    <TableCell>
                      <Badge variant={id.status === "available" ? "outline" : "secondary"}>{id.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{id.assignedToUid || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayoutBatchesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ batches: PayoutBatch[] }>({
    queryKey: ["/api/admin/affiliate/payout-batches"],
    queryFn: () => apiRequest("/api/admin/affiliate/payout-batches") as Promise<{ batches: PayoutBatch[] }>,
  });

  const processMutation = useMutation({
    mutationFn: (batchId: string) => apiRequest("/api/admin/affiliate/payout-batches/process", { method: "POST", body: { batchId } }),
    onSuccess: () => {
      toast({ title: "Batch processed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate/payout-batches"] });
    },
    onError: (error) => toast({ title: "Batch processing failed", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout batches</CardTitle>
        <CardDescription>Created automatically on the monthly payout run, or retry a failed batch manually.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.batches || data.batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payout batches yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs">{batch.creatorUserId}</TableCell>
                  <TableCell>{batch.periodLabel}</TableCell>
                  <TableCell className="text-right">${batch.totalAmountUsd.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={batch.state === "Completed" ? "success" : batch.state === "Failed" ? "destructive" : "outline"}>
                      {batch.state}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {batch.state === "Failed" && (
                      <Button variant="ghost" size="sm" onClick={() => processMutation.mutate(batch.id)} disabled={processMutation.isPending}>
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function AffiliateAdmin() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="affiliate-admin-title">
          Affiliate & Creator Payouts
        </h1>
        <p className="text-sm text-muted-foreground">Reconcile retailer reports, manage tracking IDs, and review payouts.</p>
      </div>

      <Tabs defaultValue="imports">
        <TabsList>
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="tracking-pool">Tracking IDs</TabsTrigger>
          <TabsTrigger value="payouts">Payout batches</TabsTrigger>
        </TabsList>
        <TabsContent value="imports" className="mt-6">
          <ImportsTab />
        </TabsContent>
        <TabsContent value="tracking-pool" className="mt-6">
          <TrackingPoolTab />
        </TabsContent>
        <TabsContent value="payouts" className="mt-6">
          <PayoutBatchesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
