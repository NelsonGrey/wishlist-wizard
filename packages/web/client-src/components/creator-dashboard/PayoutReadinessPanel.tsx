import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { WalletCards, ExternalLink } from "lucide-react";

type DashboardSummary = {
  payoutReadiness: {
    payoutsEnabled: boolean;
    minimumPayoutThresholdUsd: number;
    outstandingClawbackBalanceUsd: number;
    stripeAccountStatus: "not_created" | "onboarding_incomplete" | "restricted" | "enabled";
  };
  byState: Record<string, { count: number; totalUsd: number }>;
};

type PayoutBatch = {
  id: string;
  state: string;
  totalAmountUsd: number;
  periodLabel: string;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  not_created: "Not started",
  onboarding_incomplete: "Onboarding in progress",
  restricted: "Action needed",
  enabled: "Ready for payouts",
};

export default function PayoutReadinessPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/creator/commission-summary"],
    queryFn: () => apiRequest("/api/creator/commission-summary") as Promise<DashboardSummary>,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyData } = useQuery<{ batches: PayoutBatch[] }>({
    queryKey: ["/api/creator/payout-history"],
    queryFn: () => apiRequest("/api/creator/payout-history") as Promise<{ batches: PayoutBatch[] }>,
    staleTime: 5 * 60 * 1000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/creator/connect/create", { method: "POST" });
      const linkResult = (await apiRequest("/api/creator/connect/onboarding-link", {
        method: "POST",
        body: {
          returnUrl: window.location.href,
          refreshUrl: window.location.href,
        },
      })) as { url: string };
      return linkResult;
    },
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error: any) => {
      setIsConnecting(false);
      toast({
        title: "Couldn't start payout setup",
        description: error?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/creator/commission-summary"] }),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const readiness = summary?.payoutReadiness;
  const payableUsd = summary?.byState?.Payable?.totalUsd ?? 0;
  const threshold = readiness?.minimumPayoutThresholdUsd ?? 25;
  const progressPercent = threshold > 0 ? Math.min(100, (payableUsd / threshold) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-4 w-4" /> Payout account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={readiness?.stripeAccountStatus === "enabled" ? "success" : "outline"}>
              {STATUS_LABEL[readiness?.stripeAccountStatus ?? "not_created"]}
            </Badge>
            {readiness?.stripeAccountStatus !== "enabled" && (
              <Button
                onClick={() => {
                  setIsConnecting(true);
                  connectMutation.mutate();
                }}
                disabled={isConnecting || connectMutation.isPending}
              >
                {readiness?.stripeAccountStatus === "not_created" ? "Set up payouts" : "Continue setup"}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
            {(readiness?.outstandingClawbackBalanceUsd ?? 0) > 0 && (
              <p className="text-sm text-amber-700">
                ${readiness!.outstandingClawbackBalanceUsd.toFixed(2)} owed from a return or correction will be
                deducted from your next payout.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threshold progress</CardTitle>
            <CardDescription>
              ${payableUsd.toFixed(2)} of ${threshold.toFixed(2)} minimum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} />
            <p className="mt-2 text-xs text-muted-foreground">
              Payable commissions batch into a payout automatically once they clear the minimum threshold and your
              payout account is ready.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {!historyData?.batches || historyData.batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.periodLabel}</TableCell>
                    <TableCell className="text-right">${batch.totalAmountUsd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={batch.state === "Completed" ? "success" : batch.state === "Failed" ? "destructive" : "outline"}>
                        {batch.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {batch.completedAt ? format(new Date(batch.completedAt), "MMM d, yyyy") : format(new Date(batch.createdAt), "MMM d, yyyy")}
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
